-- Electronic assignments: definitions, submissions, storage, and server-side submit.

DO $$ BEGIN
  CREATE TYPE public.assignment_submission_status AS ENUM (
    'submitted',
    'late',
    'graded',
    'missing'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_ar text NOT NULL,
  instructions_en text NOT NULL DEFAULT '',
  instructions_ar text NOT NULL DEFAULT '',
  grade text NOT NULL,
  section text CHECK (section IS NULL OR section IN ('A', 'B', 'C', 'D', 'E', 'F')),
  islamic_group text CHECK (islamic_group IS NULL OR islamic_group IN ('A', 'B')),
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  due_date timestamptz NOT NULL,
  attachment_path text,
  attachment_name text,
  attachment_mime text,
  max_points numeric NOT NULL DEFAULT 100 CHECK (max_points > 0),
  published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_grade ON public.assignments(grade);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_published ON public.assignments(published);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson ON public.assignments(lesson_id);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.assignment_submission_status NOT NULL DEFAULT 'submitted',
  text_response text,
  file_path text,
  file_name text,
  file_mime text,
  score numeric CHECK (score IS NULL OR score >= 0),
  max_points numeric,
  feedback_en text,
  feedback_ar text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  graded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment
  ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student
  ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status
  ON public.assignment_submissions(status);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- Assignments: admin full access
DROP POLICY IF EXISTS assignments_admin_all ON public.assignments;
CREATE POLICY assignments_admin_all ON public.assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Assignments: students read published assignments matching their profile
DROP POLICY IF EXISTS assignments_student_select ON public.assignments;
CREATE POLICY assignments_student_select ON public.assignments
  FOR SELECT TO authenticated
  USING (
    published = true
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.grade = assignments.grade
        AND (assignments.section IS NULL OR assignments.section = p.section)
        AND (assignments.islamic_group IS NULL OR assignments.islamic_group = p.islamic_group)
    )
  );

-- Assignments: parents read published assignments for linked children
DROP POLICY IF EXISTS assignments_parent_select ON public.assignments;
CREATE POLICY assignments_parent_select ON public.assignments
  FOR SELECT TO authenticated
  USING (
    published = true
    AND EXISTS (
      SELECT 1
      FROM public.parent_student_links psl
      JOIN public.profiles child ON child.user_id = psl.student_user_id
      WHERE psl.parent_user_id = auth.uid()
        AND child.grade = assignments.grade
        AND (assignments.section IS NULL OR assignments.section = child.section)
        AND (assignments.islamic_group IS NULL OR assignments.islamic_group = child.islamic_group)
    )
  );

-- Submissions: students read own
DROP POLICY IF EXISTS assignment_submissions_select_own ON public.assignment_submissions;
CREATE POLICY assignment_submissions_select_own ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- Submissions: admin full access
DROP POLICY IF EXISTS assignment_submissions_admin_all ON public.assignment_submissions;
CREATE POLICY assignment_submissions_admin_all ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Submissions: parents read linked children
DROP POLICY IF EXISTS assignment_submissions_parent_select ON public.assignment_submissions;
CREATE POLICY assignment_submissions_parent_select ON public.assignment_submissions
  FOR SELECT TO authenticated
  USING (public.parent_can_read_student(assignment_submissions.student_id));

GRANT SELECT ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
GRANT SELECT ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;

-- Storage bucket for assignment attachments and student submission files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-files',
  'assignment-files',
  false,
  20971520,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

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
            )
        )
      )
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND (storage.foldername(name))[3] = auth.uid()::text
      )
      OR public.parent_can_read_student(((storage.foldername(name))[3])::uuid)
    )
  );

DROP POLICY IF EXISTS assignment_files_insert ON storage.objects;
CREATE POLICY assignment_files_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assignment-files'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND (storage.foldername(name))[3] = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS assignment_files_update ON storage.objects;
CREATE POLICY assignment_files_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'assignment-files'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND (storage.foldername(name))[3] = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    bucket_id = 'assignment-files'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND (storage.foldername(name))[3] = auth.uid()::text
      )
    )
  );

DROP POLICY IF EXISTS assignment_files_delete ON storage.objects;
CREATE POLICY assignment_files_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'assignment-files'
    AND public.has_role(auth.uid(), 'admin')
  );

-- Server-authoritative assignment submission
CREATE OR REPLACE FUNCTION public.submit_assignment(
  p_assignment_id uuid,
  p_text_response text DEFAULT NULL,
  p_file_path text DEFAULT NULL,
  p_file_name text DEFAULT NULL,
  p_file_mime text DEFAULT NULL
)
RETURNS public.assignment_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_assignment public.assignments;
  v_status public.assignment_submission_status;
  v_result public.assignment_submissions;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_assignment
  FROM public.assignments a
  WHERE a.id = p_assignment_id
    AND a.published = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = v_uid
      AND p.grade = v_assignment.grade
      AND (v_assignment.section IS NULL OR v_assignment.section = p.section)
      AND (v_assignment.islamic_group IS NULL OR v_assignment.islamic_group = p.islamic_group)
  ) THEN
    RAISE EXCEPTION 'Assignment not available for your profile' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(trim(p_text_response), '') = '' AND COALESCE(trim(p_file_path), '') = '' THEN
    RAISE EXCEPTION 'Text or file submission required' USING ERRCODE = 'P0001';
  END IF;

  v_status := CASE
    WHEN now() > v_assignment.due_date THEN 'late'::public.assignment_submission_status
    ELSE 'submitted'::public.assignment_submission_status
  END;

  INSERT INTO public.assignment_submissions (
    assignment_id,
    student_id,
    status,
    text_response,
    file_path,
    file_name,
    file_mime,
    max_points,
    submitted_at
  )
  VALUES (
    p_assignment_id,
    v_uid,
    v_status,
    NULLIF(trim(p_text_response), ''),
    NULLIF(trim(p_file_path), ''),
    NULLIF(trim(p_file_name), ''),
    NULLIF(trim(p_file_mime), ''),
    v_assignment.max_points,
    now()
  )
  ON CONFLICT (assignment_id, student_id) DO UPDATE
  SET
    status = EXCLUDED.status,
    text_response = EXCLUDED.text_response,
    file_path = EXCLUDED.file_path,
    file_name = EXCLUDED.file_name,
    file_mime = EXCLUDED.file_mime,
    submitted_at = now(),
    score = NULL,
    feedback_en = NULL,
    feedback_ar = NULL,
    graded_at = NULL,
    graded_by = NULL
  WHERE assignment_submissions.status <> 'graded'
  RETURNING * INTO v_result;

  IF v_result IS NULL THEN
    SELECT * INTO v_result
    FROM public.assignment_submissions
    WHERE assignment_id = p_assignment_id AND student_id = v_uid;

    IF v_result.status = 'graded' THEN
      RAISE EXCEPTION 'Assignment already graded' USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_assignment(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_assignment(uuid, text, text, text, text) TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.assignment_submissions FROM authenticated;
