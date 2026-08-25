-- Teacher role foundation: app_role extension, teacher_assignments, scoped RLS helpers.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';

-- ---------------------------------------------------------------------------
-- teacher_assignments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade text NOT NULL,
  section text,
  islamic_group text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_assignments_section_check
    CHECK (section IS NULL OR section IN ('A', 'B', 'C', 'D', 'E', 'F')),
  CONSTRAINT teacher_assignments_islamic_group_check
    CHECK (islamic_group IS NULL OR islamic_group IN ('A', 'B')),
  CONSTRAINT teacher_assignments_grade_not_blank
    CHECK (trim(grade) <> '')
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher
  ON public.teacher_assignments (teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_scope
  ON public.teacher_assignments (grade, section, islamic_group);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_assignments_unique_scope
  ON public.teacher_assignments (teacher_id, grade, section, islamic_group)
  NULLS NOT DISTINCT;

COMMENT ON TABLE public.teacher_assignments IS
  'Maps teachers to grade/section/islamic_group scope. NULL section or islamic_group means all in that grade.';

GRANT SELECT ON public.teacher_assignments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teacher_assignments TO authenticated;
GRANT ALL ON public.teacher_assignments TO service_role;

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_assignments_admin_all ON public.teacher_assignments;
CREATE POLICY teacher_assignments_admin_all ON public.teacher_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS teacher_assignments_select_own ON public.teacher_assignments;
CREATE POLICY teacher_assignments_select_own ON public.teacher_assignments
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    AND public.has_role(auth.uid(), 'teacher')
  );

-- ---------------------------------------------------------------------------
-- Normalization + validation triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_teacher_assignment_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.grade := trim(COALESCE(NEW.grade, ''));
  IF NEW.grade = '' THEN
    RAISE EXCEPTION 'grade is required';
  END IF;
  NEW.section := public.normalize_profile_section(NEW.section);
  NEW.islamic_group := public.normalize_profile_islamic_group(NEW.islamic_group);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_teacher_assignment ON public.teacher_assignments;
CREATE TRIGGER trg_normalize_teacher_assignment
  BEFORE INSERT OR UPDATE ON public.teacher_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_teacher_assignment_row();

CREATE OR REPLACE FUNCTION public.validate_teacher_assignment_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(NEW.teacher_id, 'teacher') THEN
    RAISE EXCEPTION 'teacher_id must reference a user with the teacher role';
  END IF;

  IF NEW.teacher_id = auth.uid()
    AND public.has_role(auth.uid(), 'teacher')
    AND NOT public.has_role(auth.uid(), 'admin')
  THEN
    RAISE EXCEPTION 'Teachers cannot assign themselves';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_teacher_assignment ON public.teacher_assignments;
CREATE TRIGGER trg_validate_teacher_assignment
  BEFORE INSERT OR UPDATE ON public.teacher_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_teacher_assignment_row();

CREATE OR REPLACE FUNCTION public.prevent_self_teacher_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'teacher'::public.app_role AND NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot assign teacher role to yourself';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_teacher_role ON public.user_roles;
CREATE TRIGGER trg_prevent_self_teacher_role
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_teacher_role();

-- ---------------------------------------------------------------------------
-- Scoped access helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teacher_assignment_matches_profile(
  p_grade text,
  p_section text,
  p_islamic_group text,
  prof public.profiles
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(COALESCE(p_grade, '')) = trim(COALESCE(prof.grade, ''))
    AND trim(COALESCE(p_grade, '')) <> ''
    AND (
      p_section IS NULL
      OR prof.section IS NOT DISTINCT FROM p_section
    )
    AND (
      p_islamic_group IS NULL
      OR prof.islamic_group IS NOT DISTINCT FROM p_islamic_group
    );
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_read_student(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher')
    AND EXISTS (
      SELECT 1
      FROM public.teacher_assignments ta
      JOIN public.profiles p ON p.user_id = target_student_id
      JOIN public.user_roles ur
        ON ur.user_id = p.user_id
       AND ur.role = 'student'::public.app_role
      WHERE ta.teacher_id = auth.uid()
        AND public.teacher_assignment_matches_profile(
          ta.grade,
          ta.section,
          ta.islamic_group,
          p
        )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_can_read_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_read_student(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.teacher_can_read_assignment_row(
  p_grade text,
  p_section text,
  p_islamic_group text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher')
    AND EXISTS (
      SELECT 1
      FROM public.teacher_assignments ta
      WHERE ta.teacher_id = auth.uid()
        AND trim(ta.grade) = trim(COALESCE(p_grade, ''))
        AND trim(COALESCE(p_grade, '')) <> ''
        AND (
          ta.section IS NULL
          OR p_section IS NULL
          OR ta.section = p_section
        )
        AND (
          ta.islamic_group IS NULL
          OR p_islamic_group IS NULL
          OR ta.islamic_group = p_islamic_group
        )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_can_read_assignment_row(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_read_assignment_row(text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Student data: scoped SELECT for teachers (students in assignment scope only)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS profiles_teacher_select ON public.profiles;
CREATE POLICY profiles_teacher_select ON public.profiles
  FOR SELECT TO authenticated
  USING (public.teacher_can_read_student(profiles.user_id));

DROP POLICY IF EXISTS lesson_quiz_submissions_teacher_select ON public.lesson_quiz_submissions;
CREATE POLICY lesson_quiz_submissions_teacher_select ON public.lesson_quiz_submissions
  FOR SELECT TO authenticated
  USING (public.teacher_can_read_student(lesson_quiz_submissions.student_id));

DROP POLICY IF EXISTS quiz_certificates_teacher_select ON public.quiz_certificates;
CREATE POLICY quiz_certificates_teacher_select ON public.quiz_certificates
  FOR SELECT TO authenticated
  USING (public.teacher_can_read_student(quiz_certificates.student_id));

DROP POLICY IF EXISTS assignment_submissions_teacher_select ON public.assignment_submissions;
CREATE POLICY assignment_submissions_teacher_select ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (public.teacher_can_read_student(assignment_submissions.student_id));

DROP POLICY IF EXISTS assignments_teacher_select ON public.assignments;
CREATE POLICY assignments_teacher_select ON public.assignments
  FOR SELECT TO authenticated
  USING (
    public.teacher_can_read_assignment_row(
      assignments.grade,
      assignments.section,
      assignments.islamic_group
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: profile photos + assignment files for scoped students
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS profile_photos_select ON storage.objects;
CREATE POLICY profile_photos_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin')
      OR public.parent_can_read_student(((storage.foldername(name))[1])::uuid)
      OR public.teacher_can_read_student(((storage.foldername(name))[1])::uuid)
    )
  );

DROP POLICY IF EXISTS assignment_files_select ON storage.objects;
CREATE POLICY assignment_files_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'assignment-files'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        (storage.foldername(name))[1] = 'attachments'
        AND EXISTS (
          SELECT 1
          FROM public.assignments a
          WHERE a.attachment_path = storage.objects.name
            AND a.published = true
            AND (
              EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.user_id = auth.uid()
                  AND p.grade = a.grade
                  AND (a.section IS NULL OR a.section = p.section)
                  AND (a.islamic_group IS NULL OR a.islamic_group = p.islamic_group)
              )
              OR EXISTS (
                SELECT 1
                FROM public.parent_student_links psl
                JOIN public.profiles child ON child.user_id = psl.student_user_id
                WHERE psl.parent_user_id = auth.uid()
                  AND child.grade = a.grade
                  AND (a.section IS NULL OR a.section = child.section)
                  AND (a.islamic_group IS NULL OR a.islamic_group = child.islamic_group)
              )
              OR public.teacher_can_read_assignment_row(
                a.grade,
                a.section,
                a.islamic_group
              )
            )
        )
      )
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND (storage.foldername(name))[3] = auth.uid()::text
      )
      OR public.parent_can_read_student(((storage.foldername(name))[3])::uuid)
      OR public.teacher_can_read_student(((storage.foldername(name))[3])::uuid)
    )
  );

REVOKE EXECUTE ON FUNCTION public.normalize_teacher_assignment_row() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_teacher_assignment_row() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_teacher_role() FROM PUBLIC, anon, authenticated;
