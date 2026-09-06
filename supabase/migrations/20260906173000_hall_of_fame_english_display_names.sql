-- Honor Board: expose canonical English student names for display (stored data unchanged).

CREATE OR REPLACE FUNCTION public.get_hall_of_fame()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_top_students jsonb;
  v_student_of_month jsonb;
  v_grade_champions jsonb;
BEGIN
  WITH admin_users AS (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
  ),
  submission_avg AS (
    SELECT
      lqs.student_id AS user_id,
      ROUND(AVG(lqs.percentage))::int AS avg_score
    FROM public.lesson_quiz_submissions lqs
    GROUP BY lqs.student_id
  ),
  cert_counts AS (
    SELECT
      qc.student_id AS user_id,
      COUNT(*)::int AS cert_count
    FROM public.quiz_certificates qc
    GROUP BY qc.student_id
  ),
  student_perf AS (
    SELECT
      p.user_id,
      NULLIF(trim(COALESCE(p.english_name, '')), '') AS english_name,
      NULLIF(trim(COALESCE(p.full_name, '')), '') AS full_name,
      NULLIF(trim(COALESCE(p.arabic_name, '')), '') AS arabic_name,
      NULLIF(trim(p.grade), '') AS grade,
      public.normalize_profile_islamic_group(p.islamic_group) AS islamic_group,
      p.profile_photo_path,
      sa.avg_score,
      COALESCE(cc.cert_count, 0) AS cert_count
    FROM public.profiles p
    INNER JOIN submission_avg sa ON sa.user_id = p.user_id
    LEFT JOIN cert_counts cc ON cc.user_id = p.user_id
    WHERE p.user_id NOT IN (SELECT user_id FROM admin_users)
  ),
  ranked AS (
    SELECT
      sp.*,
      ROW_NUMBER() OVER (
        ORDER BY sp.avg_score DESC, sp.cert_count DESC, sp.user_id
      )::int AS rn
    FROM student_perf sp
  ),
  top_ten AS (
    SELECT *
    FROM ranked
    WHERE rn <= 10
    ORDER BY rn
  ),
  grade_ranked AS (
    SELECT
      sp.*,
      ROW_NUMBER() OVER (
        PARTITION BY sp.grade
        ORDER BY sp.avg_score DESC, sp.cert_count DESC, sp.user_id
      )::int AS grade_rn
    FROM student_perf sp
    WHERE sp.grade IS NOT NULL
  )
  SELECT
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'english_name', COALESCE(t.english_name, t.full_name, t.arabic_name, '—'),
            'arabic_name', COALESCE(t.arabic_name, '—'),
            'grade', t.grade,
            'islamic_group', t.islamic_group,
            'profile_photo_path', t.profile_photo_path,
            'average_score_pct', t.avg_score,
            'certificates_earned', t.cert_count
          )
          ORDER BY t.rn
        )
        FROM top_ten t
      ),
      '[]'::jsonb
    ),
    (
      SELECT jsonb_build_object(
        'english_name', COALESCE(r.english_name, r.full_name, r.arabic_name, '—'),
        'arabic_name', COALESCE(r.arabic_name, '—'),
        'grade', r.grade,
        'islamic_group', r.islamic_group,
        'profile_photo_path', r.profile_photo_path,
        'average_score_pct', r.avg_score,
        'certificates_earned', r.cert_count
      )
      FROM ranked r
      WHERE r.rn = 1
      LIMIT 1
    ),
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'grade', gr.grade,
            'english_name', COALESCE(gr.english_name, gr.full_name, gr.arabic_name, '—'),
            'arabic_name', COALESCE(gr.arabic_name, '—'),
            'profile_photo_path', gr.profile_photo_path,
            'average_score_pct', gr.avg_score,
            'islamic_group', gr.islamic_group,
            'certificates_earned', gr.cert_count
          )
          ORDER BY gr.grade
        )
        FROM grade_ranked gr
        WHERE gr.grade_rn = 1
      ),
      '[]'::jsonb
    )
  INTO v_top_students, v_student_of_month, v_grade_champions;

  RETURN jsonb_build_object(
    'top_students', v_top_students,
    'student_of_month', v_student_of_month,
    'grade_champions', v_grade_champions
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_hall_of_fame()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_top_students jsonb;
  v_student_of_month jsonb;
  v_grade_champions jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  WITH admin_users AS (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
  ),
  submission_avg AS (
    SELECT
      lqs.student_id AS user_id,
      ROUND(AVG(lqs.percentage))::int AS avg_score
    FROM public.lesson_quiz_submissions lqs
    GROUP BY lqs.student_id
  ),
  cert_counts AS (
    SELECT
      qc.student_id AS user_id,
      COUNT(*)::int AS cert_count
    FROM public.quiz_certificates qc
    GROUP BY qc.student_id
  ),
  student_perf AS (
    SELECT
      p.user_id,
      NULLIF(trim(COALESCE(p.english_name, '')), '') AS english_name,
      NULLIF(trim(COALESCE(p.full_name, '')), '') AS full_name,
      NULLIF(trim(COALESCE(p.arabic_name, '')), '') AS arabic_name,
      NULLIF(trim(p.grade), '') AS grade,
      public.normalize_profile_section(p.section) AS section,
      public.normalize_profile_islamic_group(p.islamic_group) AS islamic_group,
      p.profile_photo_path,
      sa.avg_score,
      COALESCE(cc.cert_count, 0) AS cert_count
    FROM public.profiles p
    INNER JOIN submission_avg sa ON sa.user_id = p.user_id
    LEFT JOIN cert_counts cc ON cc.user_id = p.user_id
    WHERE p.user_id NOT IN (SELECT user_id FROM admin_users)
  ),
  ranked AS (
    SELECT
      sp.*,
      ROW_NUMBER() OVER (
        ORDER BY sp.avg_score DESC, sp.cert_count DESC, sp.user_id
      )::int AS rn
    FROM student_perf sp
  ),
  top_ten AS (
    SELECT *
    FROM ranked
    WHERE rn <= 10
    ORDER BY rn
  ),
  grade_ranked AS (
    SELECT
      sp.*,
      ROW_NUMBER() OVER (
        PARTITION BY sp.grade
        ORDER BY sp.avg_score DESC, sp.cert_count DESC, sp.user_id
      )::int AS grade_rn
    FROM student_perf sp
    WHERE sp.grade IS NOT NULL
  )
  SELECT
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', t.user_id,
            'english_name', COALESCE(t.english_name, t.full_name, t.arabic_name, '—'),
            'arabic_name', COALESCE(t.arabic_name, '—'),
            'grade', t.grade,
            'section', t.section,
            'islamic_group', t.islamic_group,
            'profile_photo_path', t.profile_photo_path,
            'average_score_pct', t.avg_score,
            'certificates_earned', t.cert_count
          )
          ORDER BY t.rn
        )
        FROM top_ten t
      ),
      '[]'::jsonb
    ),
    (
      SELECT jsonb_build_object(
        'user_id', r.user_id,
        'english_name', COALESCE(r.english_name, r.full_name, r.arabic_name, '—'),
        'arabic_name', COALESCE(r.arabic_name, '—'),
        'grade', r.grade,
        'section', r.section,
        'islamic_group', r.islamic_group,
        'profile_photo_path', r.profile_photo_path,
        'average_score_pct', r.avg_score,
        'certificates_earned', r.cert_count
      )
      FROM ranked r
      WHERE r.rn = 1
      LIMIT 1
    ),
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', gr.user_id,
            'grade', gr.grade,
            'section', gr.section,
            'english_name', COALESCE(gr.english_name, gr.full_name, gr.arabic_name, '—'),
            'arabic_name', COALESCE(gr.arabic_name, '—'),
            'profile_photo_path', gr.profile_photo_path,
            'average_score_pct', gr.avg_score,
            'islamic_group', gr.islamic_group,
            'certificates_earned', gr.cert_count
          )
          ORDER BY gr.grade
        )
        FROM grade_ranked gr
        WHERE gr.grade_rn = 1
      ),
      '[]'::jsonb
    )
  INTO v_top_students, v_student_of_month, v_grade_champions;

  RETURN jsonb_build_object(
    'top_students', v_top_students,
    'student_of_month', v_student_of_month,
    'grade_champions', v_grade_champions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_hall_of_fame() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hall_of_fame() TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_admin_hall_of_fame() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_hall_of_fame() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_hall_of_fame() TO authenticated;
