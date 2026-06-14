-- Anonymous peer rankings for parent performance reports (no student names exposed).

CREATE OR REPLACE FUNCTION public.get_student_peer_rankings(p_student_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_grade text;
  v_section text;
  v_islamic_group text;
  v_grade_rank int;
  v_grade_total int;
  v_section_rank int;
  v_section_total int;
  v_group_rank int;
  v_group_total int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT (
    v_uid = p_student_user_id
    OR public.parent_can_read_student(p_student_user_id)
    OR public.has_role(v_uid, 'admin')
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT
    NULLIF(trim(p.grade), ''),
    public.normalize_profile_section(p.section),
    public.normalize_profile_islamic_group(p.islamic_group)
  INTO v_grade, v_section, v_islamic_group
  FROM public.profiles p
  WHERE p.user_id = p_student_user_id;

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
      NULLIF(trim(p.grade), '') AS grade,
      public.normalize_profile_section(p.section) AS section,
      public.normalize_profile_islamic_group(p.islamic_group) AS islamic_group,
      sa.avg_score,
      COALESCE(cc.cert_count, 0) AS cert_count
    FROM public.profiles p
    INNER JOIN submission_avg sa ON sa.user_id = p.user_id
    LEFT JOIN cert_counts cc ON cc.user_id = p.user_id
    WHERE p.user_id NOT IN (SELECT user_id FROM admin_users)
  ),
  grade_ranks AS (
    SELECT
      user_id,
      ROW_NUMBER() OVER (
        ORDER BY avg_score DESC, cert_count DESC, user_id
      )::int AS rn
    FROM student_perf
    WHERE v_grade IS NOT NULL AND grade = v_grade
  ),
  section_ranks AS (
    SELECT
      user_id,
      ROW_NUMBER() OVER (
        ORDER BY avg_score DESC, cert_count DESC, user_id
      )::int AS rn
    FROM student_perf
    WHERE v_grade IS NOT NULL
      AND v_section IS NOT NULL
      AND grade = v_grade
      AND section IS NOT DISTINCT FROM v_section
  ),
  group_ranks AS (
    SELECT
      user_id,
      ROW_NUMBER() OVER (
        ORDER BY avg_score DESC, cert_count DESC, user_id
      )::int AS rn
    FROM student_perf
    WHERE v_grade IS NOT NULL
      AND v_islamic_group IS NOT NULL
      AND grade = v_grade
      AND islamic_group IS NOT DISTINCT FROM v_islamic_group
  )
  SELECT
    (SELECT gr.rn FROM grade_ranks gr WHERE gr.user_id = p_student_user_id),
    (SELECT COUNT(*)::int FROM student_perf sp WHERE v_grade IS NOT NULL AND sp.grade = v_grade),
    (SELECT sr.rn FROM section_ranks sr WHERE sr.user_id = p_student_user_id),
    (
      SELECT COUNT(*)::int
      FROM student_perf sp
      WHERE v_grade IS NOT NULL
        AND v_section IS NOT NULL
        AND sp.grade = v_grade
        AND sp.section IS NOT DISTINCT FROM v_section
    ),
    (SELECT ir.rn FROM group_ranks ir WHERE ir.user_id = p_student_user_id),
    (
      SELECT COUNT(*)::int
      FROM student_perf sp
      WHERE v_grade IS NOT NULL
        AND v_islamic_group IS NOT NULL
        AND sp.grade = v_grade
        AND sp.islamic_group IS NOT DISTINCT FROM v_islamic_group
    )
  INTO
    v_grade_rank,
    v_grade_total,
    v_section_rank,
    v_section_total,
    v_group_rank,
    v_group_total;

  RETURN jsonb_build_object(
    'grade', jsonb_build_object(
      'rank', v_grade_rank,
      'total', COALESCE(v_grade_total, 0)
    ),
    'section', jsonb_build_object(
      'rank', v_section_rank,
      'total', COALESCE(v_section_total, 0)
    ),
    'islamic_group', jsonb_build_object(
      'rank', v_group_rank,
      'total', COALESCE(v_group_total, 0)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_peer_rankings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_peer_rankings(uuid) TO authenticated;
