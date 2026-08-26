-- Teacher scoped CRUD on grade-based CMS tables, parent visibility, and cms-uploads writes.
-- Teachers remain role = teacher; no admin privileges granted.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teacher_can_manage_department_content()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.teacher_is_lead_teacher();
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_can_manage_department_content() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_manage_department_content() TO authenticated;

CREATE OR REPLACE FUNCTION public.teacher_can_manage_file_row(p_grade text, p_lesson text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'teacher') THEN
    RETURN false;
  END IF;

  IF NOT public.teacher_can_manage_lesson_grade(p_grade) THEN
    RETURN false;
  END IF;

  IF trim(COALESCE(p_lesson, '')) = '' THEN
    RETURN true;
  END IF;

  BEGIN
    RETURN public.teacher_can_write_lesson_id(p_lesson::uuid);
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN false;
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_can_manage_file_row(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_manage_file_row(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.teacher_can_read_parent(target_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher')
    AND EXISTS (
      SELECT 1
      FROM public.parent_student_links psl
      WHERE psl.parent_user_id = target_parent_id
        AND public.teacher_can_read_student(psl.student_user_id)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_can_read_parent(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_read_parent(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- videos: grade-scoped teacher CRUD
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS videos_teacher_select ON public.videos;
CREATE POLICY videos_teacher_select ON public.videos
  FOR SELECT TO authenticated
  USING (public.teacher_can_manage_lesson_grade(videos.grade));

DROP POLICY IF EXISTS videos_teacher_insert ON public.videos;
CREATE POLICY videos_teacher_insert ON public.videos
  FOR INSERT TO authenticated
  WITH CHECK (public.teacher_can_manage_lesson_grade(videos.grade));

DROP POLICY IF EXISTS videos_teacher_update ON public.videos;
CREATE POLICY videos_teacher_update ON public.videos
  FOR UPDATE TO authenticated
  USING (public.teacher_can_manage_lesson_grade(videos.grade))
  WITH CHECK (public.teacher_can_manage_lesson_grade(videos.grade));

DROP POLICY IF EXISTS videos_teacher_delete ON public.videos;
CREATE POLICY videos_teacher_delete ON public.videos
  FOR DELETE TO authenticated
  USING (public.teacher_can_manage_lesson_grade(videos.grade));

-- ---------------------------------------------------------------------------
-- files: grade-scoped teacher CRUD (optional lesson link validated)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS files_teacher_select ON public.files;
CREATE POLICY files_teacher_select ON public.files
  FOR SELECT TO authenticated
  USING (public.teacher_can_manage_file_row(files.grade, files.lesson));

DROP POLICY IF EXISTS files_teacher_insert ON public.files;
CREATE POLICY files_teacher_insert ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (public.teacher_can_manage_file_row(files.grade, files.lesson));

DROP POLICY IF EXISTS files_teacher_update ON public.files;
CREATE POLICY files_teacher_update ON public.files
  FOR UPDATE TO authenticated
  USING (public.teacher_can_manage_file_row(files.grade, files.lesson))
  WITH CHECK (public.teacher_can_manage_file_row(files.grade, files.lesson));

DROP POLICY IF EXISTS files_teacher_delete ON public.files;
CREATE POLICY files_teacher_delete ON public.files
  FOR DELETE TO authenticated
  USING (public.teacher_can_manage_file_row(files.grade, files.lesson));

-- ---------------------------------------------------------------------------
-- unit_information: grade-scoped teacher CRUD
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS unit_information_teacher_select ON public.unit_information;
CREATE POLICY unit_information_teacher_select ON public.unit_information
  FOR SELECT TO authenticated
  USING (public.teacher_can_manage_lesson_grade(unit_information.grade));

DROP POLICY IF EXISTS unit_information_teacher_insert ON public.unit_information;
CREATE POLICY unit_information_teacher_insert ON public.unit_information
  FOR INSERT TO authenticated
  WITH CHECK (public.teacher_can_manage_lesson_grade(unit_information.grade));

DROP POLICY IF EXISTS unit_information_teacher_update ON public.unit_information;
CREATE POLICY unit_information_teacher_update ON public.unit_information
  FOR UPDATE TO authenticated
  USING (public.teacher_can_manage_lesson_grade(unit_information.grade))
  WITH CHECK (public.teacher_can_manage_lesson_grade(unit_information.grade));

DROP POLICY IF EXISTS unit_information_teacher_delete ON public.unit_information;
CREATE POLICY unit_information_teacher_delete ON public.unit_information
  FOR DELETE TO authenticated
  USING (public.teacher_can_manage_lesson_grade(unit_information.grade));

-- ---------------------------------------------------------------------------
-- articles: department-wide content — lead teacher only (no grade column on table)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS articles_teacher_select ON public.articles;
CREATE POLICY articles_teacher_select ON public.articles
  FOR SELECT TO authenticated
  USING (public.teacher_can_manage_department_content());

DROP POLICY IF EXISTS articles_teacher_insert ON public.articles;
CREATE POLICY articles_teacher_insert ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (public.teacher_can_manage_department_content());

DROP POLICY IF EXISTS articles_teacher_update ON public.articles;
CREATE POLICY articles_teacher_update ON public.articles
  FOR UPDATE TO authenticated
  USING (public.teacher_can_manage_department_content())
  WITH CHECK (public.teacher_can_manage_department_content());

DROP POLICY IF EXISTS articles_teacher_delete ON public.articles;
CREATE POLICY articles_teacher_delete ON public.articles
  FOR DELETE TO authenticated
  USING (public.teacher_can_manage_department_content());

-- ---------------------------------------------------------------------------
-- Parent links + parent profiles: scoped read for teachers
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS parent_student_links_teacher_select ON public.parent_student_links;
CREATE POLICY parent_student_links_teacher_select ON public.parent_student_links
  FOR SELECT TO authenticated
  USING (public.teacher_can_read_student(parent_student_links.student_user_id));

DROP POLICY IF EXISTS parent_profiles_teacher_select ON public.parent_profiles;
CREATE POLICY parent_profiles_teacher_select ON public.parent_profiles
  FOR SELECT TO authenticated
  USING (public.teacher_can_read_parent(parent_profiles.user_id));

-- ---------------------------------------------------------------------------
-- cms-uploads: teachers may upload assets (table RLS enforces scope on rows)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS cms_uploads_teacher_insert ON storage.objects;
CREATE POLICY cms_uploads_teacher_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cms-uploads'
    AND public.has_role(auth.uid(), 'teacher')
  );
