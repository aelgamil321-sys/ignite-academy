-- Teacher dashboard: lead-teacher capability, scoped RLS, writes, grading, storage.

-- ---------------------------------------------------------------------------
-- Lead teacher profile (admin grants/revokes; teachers remain role = teacher)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_lead_teacher boolean NOT NULL DEFAULT false,
  lead_granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_granted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_profiles_select ON public.teacher_profiles;
CREATE POLICY teacher_profiles_select ON public.teacher_profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS teacher_profiles_admin_all ON public.teacher_profiles;
CREATE POLICY teacher_profiles_admin_all ON public.teacher_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.teacher_profiles TO authenticated;
GRANT ALL ON public.teacher_profiles TO service_role;

INSERT INTO public.teacher_profiles (user_id, is_lead_teacher)
SELECT ur.user_id, false
FROM public.user_roles ur
WHERE ur.role = 'teacher'::public.app_role
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Scoped access helpers (replace foundation helpers for lead + normal teachers)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teacher_is_lead_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher')
    AND EXISTS (
      SELECT 1
      FROM public.teacher_profiles tp
      WHERE tp.user_id = auth.uid()
        AND tp.is_lead_teacher = true
    );
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_is_lead_teacher() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_is_lead_teacher() TO authenticated;

CREATE OR REPLACE FUNCTION public.teacher_is_islamic_department_student(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur
      ON ur.user_id = p.user_id
     AND ur.role = 'student'::public.app_role
    WHERE p.user_id = target_student_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_is_islamic_department_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_is_islamic_department_student(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.teacher_can_read_student(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher')
    AND (
      (
        public.teacher_is_lead_teacher()
        AND public.teacher_is_islamic_department_student(target_student_id)
      )
      OR EXISTS (
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
      )
    );
$$;

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
    AND (
      public.teacher_is_lead_teacher()
      OR EXISTS (
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
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_manage_lesson_grade(p_grade text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher')
    AND (
      public.teacher_is_lead_teacher()
      OR EXISTS (
        SELECT 1
        FROM public.teacher_assignments ta
        WHERE ta.teacher_id = auth.uid()
          AND trim(ta.grade) = trim(COALESCE(p_grade, ''))
          AND trim(COALESCE(p_grade, '')) <> ''
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_can_manage_lesson_grade(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_manage_lesson_grade(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.teacher_can_write_lesson_grade(p_grade text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.teacher_can_manage_lesson_grade(p_grade);
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_write_lesson_id(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.id = p_lesson_id
      AND public.teacher_can_manage_lesson_grade(l.grade)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_can_write_lesson_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_write_lesson_id(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Lessons + unit_quizzes: scoped read/write/delete for teachers
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS lessons_teacher_select ON public.lessons;
CREATE POLICY lessons_teacher_select ON public.lessons
  FOR SELECT TO authenticated
  USING (public.teacher_can_manage_lesson_grade(lessons.grade));

DROP POLICY IF EXISTS lessons_teacher_insert ON public.lessons;
CREATE POLICY lessons_teacher_insert ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (public.teacher_can_manage_lesson_grade(lessons.grade));

DROP POLICY IF EXISTS lessons_teacher_update ON public.lessons;
CREATE POLICY lessons_teacher_update ON public.lessons
  FOR UPDATE TO authenticated
  USING (public.teacher_can_manage_lesson_grade(lessons.grade))
  WITH CHECK (public.teacher_can_manage_lesson_grade(lessons.grade));

DROP POLICY IF EXISTS lessons_teacher_delete ON public.lessons;
CREATE POLICY lessons_teacher_delete ON public.lessons
  FOR DELETE TO authenticated
  USING (public.teacher_can_manage_lesson_grade(lessons.grade));

DROP POLICY IF EXISTS "Public can delete lessons" ON public.lessons;
DROP POLICY IF EXISTS lessons_admin_delete ON public.lessons;
CREATE POLICY lessons_admin_delete ON public.lessons
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS unit_quizzes_teacher_select ON public.unit_quizzes;
CREATE POLICY unit_quizzes_teacher_select ON public.unit_quizzes
  FOR SELECT TO authenticated
  USING (public.teacher_can_manage_lesson_grade(unit_quizzes.grade));

DROP POLICY IF EXISTS unit_quizzes_teacher_insert ON public.unit_quizzes;
CREATE POLICY unit_quizzes_teacher_insert ON public.unit_quizzes
  FOR INSERT TO authenticated
  WITH CHECK (public.teacher_can_manage_lesson_grade(unit_quizzes.grade));

DROP POLICY IF EXISTS unit_quizzes_teacher_update ON public.unit_quizzes;
CREATE POLICY unit_quizzes_teacher_update ON public.unit_quizzes
  FOR UPDATE TO authenticated
  USING (public.teacher_can_manage_lesson_grade(unit_quizzes.grade))
  WITH CHECK (public.teacher_can_manage_lesson_grade(unit_quizzes.grade));

DROP POLICY IF EXISTS unit_quizzes_teacher_delete ON public.unit_quizzes;
CREATE POLICY unit_quizzes_teacher_delete ON public.unit_quizzes
  FOR DELETE TO authenticated
  USING (public.teacher_can_manage_lesson_grade(unit_quizzes.grade));

DROP POLICY IF EXISTS "Public can delete unit_quizzes" ON public.unit_quizzes;
DROP POLICY IF EXISTS unit_quizzes_admin_delete ON public.unit_quizzes;
CREATE POLICY unit_quizzes_admin_delete ON public.unit_quizzes
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- Assignments: teacher scoped write + delete
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS assignments_teacher_insert ON public.assignments;
CREATE POLICY assignments_teacher_insert ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.teacher_can_read_assignment_row(
      assignments.grade,
      assignments.section,
      assignments.islamic_group
    )
  );

DROP POLICY IF EXISTS assignments_teacher_update ON public.assignments;
CREATE POLICY assignments_teacher_update ON public.assignments
  FOR UPDATE TO authenticated
  USING (
    public.teacher_can_read_assignment_row(
      assignments.grade,
      assignments.section,
      assignments.islamic_group
    )
  )
  WITH CHECK (
    public.teacher_can_read_assignment_row(
      assignments.grade,
      assignments.section,
      assignments.islamic_group
    )
  );

DROP POLICY IF EXISTS assignments_teacher_delete ON public.assignments;
CREATE POLICY assignments_teacher_delete ON public.assignments
  FOR DELETE TO authenticated
  USING (
    public.teacher_can_read_assignment_row(
      assignments.grade,
      assignments.section,
      assignments.islamic_group
    )
  );

GRANT INSERT, UPDATE, DELETE ON public.assignments TO authenticated;

-- ---------------------------------------------------------------------------
-- Grading + essay review
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS assignment_submissions_teacher_update ON public.assignment_submissions;
CREATE POLICY assignment_submissions_teacher_update ON public.assignment_submissions
  FOR UPDATE TO authenticated
  USING (public.teacher_can_read_student(assignment_submissions.student_id))
  WITH CHECK (public.teacher_can_read_student(assignment_submissions.student_id));

DROP POLICY IF EXISTS lesson_quiz_submissions_teacher_update ON public.lesson_quiz_submissions;
CREATE POLICY lesson_quiz_submissions_teacher_update ON public.lesson_quiz_submissions
  FOR UPDATE TO authenticated
  USING (public.teacher_can_read_student(lesson_quiz_submissions.student_id))
  WITH CHECK (public.teacher_can_read_student(lesson_quiz_submissions.student_id));

GRANT UPDATE ON public.assignment_submissions TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage: lesson-files + assignment attachment uploads for teachers
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS lesson_files_teacher_insert ON storage.objects;
CREATE POLICY lesson_files_teacher_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-files'
    AND public.has_role(auth.uid(), 'teacher')
    AND public.teacher_can_write_lesson_id(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS lesson_files_teacher_update ON storage.objects;
CREATE POLICY lesson_files_teacher_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'lesson-files'
    AND public.has_role(auth.uid(), 'teacher')
    AND public.teacher_can_write_lesson_id(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'lesson-files'
    AND public.has_role(auth.uid(), 'teacher')
    AND public.teacher_can_write_lesson_id(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS lesson_files_teacher_delete ON storage.objects;
CREATE POLICY lesson_files_teacher_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'lesson-files'
    AND public.has_role(auth.uid(), 'teacher')
    AND public.teacher_can_write_lesson_id(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS assignment_files_teacher_insert ON storage.objects;
CREATE POLICY assignment_files_teacher_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'attachments'
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.attachment_path = storage.objects.name
        AND public.teacher_can_read_assignment_row(a.grade, a.section, a.islamic_group)
    )
  );

DROP POLICY IF EXISTS assignment_files_teacher_update ON storage.objects;
CREATE POLICY assignment_files_teacher_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'attachments'
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.attachment_path = storage.objects.name
        AND public.teacher_can_read_assignment_row(a.grade, a.section, a.islamic_group)
    )
  )
  WITH CHECK (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'attachments'
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.attachment_path = storage.objects.name
        AND public.teacher_can_read_assignment_row(a.grade, a.section, a.islamic_group)
    )
  );

DROP POLICY IF EXISTS assignment_files_teacher_delete ON storage.objects;
CREATE POLICY assignment_files_teacher_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'assignment-files'
    AND (storage.foldername(name))[1] = 'attachments'
    AND EXISTS (
      SELECT 1
      FROM public.assignments a
      WHERE a.attachment_path = storage.objects.name
        AND public.teacher_can_read_assignment_row(a.grade, a.section, a.islamic_group)
    )
  );
