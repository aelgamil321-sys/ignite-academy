-- Role-aware student analytics helpers + Lead Teacher school-management authorization.
-- NOTE: public.profiles is NOT students-only; teacher display profiles must not be counted as students.
-- Application-layer queries were updated to filter user_roles.role = 'student'.
-- This migration adds DB authorization for Lead Teacher operational management.

-- ---------------------------------------------------------------------------
-- 1. Shared authorization helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin_or_lead_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
      OR public.teacher_is_lead_teacher();
$$;

COMMENT ON FUNCTION public.is_admin_or_lead_teacher() IS
  'True when caller is platform admin or verified lead teacher (is_lead_teacher).';

REVOKE ALL ON FUNCTION public.is_admin_or_lead_teacher() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_lead_teacher() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_lead_teacher() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Lead Teacher read access for school-management directories
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS profiles_lead_teacher_select ON public.profiles;
CREATE POLICY profiles_lead_teacher_select ON public.profiles
  FOR SELECT TO authenticated
  USING (public.teacher_is_lead_teacher());

DROP POLICY IF EXISTS user_roles_lead_teacher_select ON public.user_roles;
CREATE POLICY user_roles_lead_teacher_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.teacher_is_lead_teacher());

DROP POLICY IF EXISTS parent_profiles_lead_teacher_select ON public.parent_profiles;
CREATE POLICY parent_profiles_lead_teacher_select ON public.parent_profiles
  FOR SELECT TO authenticated
  USING (public.teacher_is_lead_teacher());

DROP POLICY IF EXISTS parent_student_links_lead_teacher_select ON public.parent_student_links;
CREATE POLICY parent_student_links_lead_teacher_select ON public.parent_student_links
  FOR SELECT TO authenticated
  USING (public.teacher_is_lead_teacher());

DROP POLICY IF EXISTS lesson_quiz_submissions_lead_teacher_select ON public.lesson_quiz_submissions;
CREATE POLICY lesson_quiz_submissions_lead_teacher_select ON public.lesson_quiz_submissions
  FOR SELECT TO authenticated
  USING (public.teacher_is_lead_teacher());

DROP POLICY IF EXISTS quiz_certificates_lead_teacher_select ON public.quiz_certificates;
CREATE POLICY quiz_certificates_lead_teacher_select ON public.quiz_certificates
  FOR SELECT TO authenticated
  USING (public.teacher_is_lead_teacher());

-- ---------------------------------------------------------------------------
-- 3. Admin Hall of Fame — allow Lead Teacher + role=student filter
-- ---------------------------------------------------------------------------

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

  IF NOT public.is_admin_or_lead_teacher() THEN
    RAISE EXCEPTION 'admin or lead teacher only' USING ERRCODE = '42501';
  END IF;

  WITH submission_avg AS (
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
      NULLIF(trim(COALESCE(p.arabic_name, '')), '') AS arabic_name,
      NULLIF(trim(p.grade), '') AS grade,
      public.normalize_profile_section(p.section) AS section,
      public.normalize_profile_islamic_group(p.islamic_group) AS islamic_group,
      p.profile_photo_path,
      sa.avg_score,
      COALESCE(cc.cert_count, 0) AS cert_count
    FROM public.profiles p
    INNER JOIN public.user_roles ur
      ON ur.user_id = p.user_id
     AND ur.role = 'student'::public.app_role
    INNER JOIN submission_avg sa ON sa.user_id = p.user_id
    LEFT JOIN cert_counts cc ON cc.user_id = p.user_id
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

COMMENT ON FUNCTION public.get_admin_hall_of_fame() IS
  'Admin/Lead Teacher Hall of Fame. Counts only user_roles.role=student profiles.';

-- ---------------------------------------------------------------------------
-- 4. Lead Teacher operational write access (mirrors admin school management)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS teacher_assignments_lead_teacher_all ON public.teacher_assignments;
CREATE POLICY teacher_assignments_lead_teacher_all ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (public.teacher_is_lead_teacher())
  WITH CHECK (public.teacher_is_lead_teacher());

DROP POLICY IF EXISTS teacher_profiles_lead_teacher_select ON public.teacher_profiles;
CREATE POLICY teacher_profiles_lead_teacher_select ON public.teacher_profiles
  FOR SELECT TO authenticated
  USING (public.teacher_is_lead_teacher());

DROP POLICY IF EXISTS parent_student_links_lead_teacher_all ON public.parent_student_links;
CREATE POLICY parent_student_links_lead_teacher_all ON public.parent_student_links
  FOR ALL TO authenticated
  USING (public.teacher_is_lead_teacher())
  WITH CHECK (public.teacher_is_lead_teacher());

-- ---------------------------------------------------------------------------
-- 5. Announcement creator names RPC — allow Lead Teacher
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_announcement_creator_display_names(p_user_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_admin_or_lead_teacher() THEN
    RAISE EXCEPTION 'admin or lead teacher only' USING ERRCODE = '42501';
  END IF;

  IF p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(
      uid.user_id::text,
      public.resolve_staff_display_name(uid.user_id)
    ),
    '{}'::jsonb
  )
  INTO v_result
  FROM unnest(p_user_ids) AS uid(user_id);

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_announcement_creator_display_names(uuid[]) IS
  'Admin/Lead Teacher display names for announcement creators. No email exposure.';
