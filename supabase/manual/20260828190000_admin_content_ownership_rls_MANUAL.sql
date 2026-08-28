/*
 * Admin content ownership: admins may SELECT all content for monitoring,
 * but UPDATE/DELETE only rows they created (created_by = auth.uid()).
 * Legacy rows with NULL created_by remain read-only for admin writes.
 */

/*
 * 1. Shared helper: stamp created_by on insert, keep immutable on update
 */

CREATE OR REPLACE FUNCTION public.stamp_content_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $stamp$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.created_by := auth.uid();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END;
$stamp$;

REVOKE ALL ON FUNCTION public.stamp_content_created_by() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stamp_content_created_by() TO authenticated, service_role;

/*
 * Resolve lesson id from lesson-files object paths.
 * Supports legacy {lesson_id}/... and current lessons/{lesson_id}/... layouts.
 */
CREATE OR REPLACE FUNCTION public.lesson_id_from_lesson_files_path(p_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, storage
AS $path$
DECLARE
  folders text[];
  first_seg text;
  second_seg text;
  uuid_pat constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  folders := storage.foldername(p_name);

  IF folders IS NULL OR coalesce(array_length(folders, 1), 0) < 1 THEN
    RETURN NULL;
  END IF;

  first_seg := folders[1];

  IF first_seg = 'lessons' AND coalesce(array_length(folders, 1), 0) >= 2 THEN
    second_seg := folders[2];
    IF second_seg ~ uuid_pat THEN
      RETURN second_seg::uuid;
    END IF;
  END IF;

  IF first_seg ~ uuid_pat THEN
    RETURN first_seg::uuid;
  END IF;

  RETURN NULL;
END;
$path$;

REVOKE ALL ON FUNCTION public.lesson_id_from_lesson_files_path(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lesson_id_from_lesson_files_path(text) TO authenticated, service_role;

/*
 * 2. ARTICLES
 * created_by already exists; tighten admin write policies.
 * articles_protect_metadata trigger remains authoritative (NOT duplicated here).
 */

DROP POLICY IF EXISTS "Admins update articles" ON public.articles;
CREATE POLICY "Admins update articles" ON public.articles
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND articles.created_by IS NOT NULL
    AND articles.created_by = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND articles.created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins delete articles" ON public.articles;
CREATE POLICY "Admins delete articles" ON public.articles
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND articles.created_by IS NOT NULL
    AND articles.created_by = auth.uid()
  );

/*
 * 3. ASSIGNMENTS
 * Split admin FOR ALL into ownership-scoped writes.
 */

DROP POLICY IF EXISTS assignments_admin_all ON public.assignments;

DROP POLICY IF EXISTS assignments_admin_select ON public.assignments;
CREATE POLICY assignments_admin_select ON public.assignments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS assignments_admin_insert ON public.assignments;
CREATE POLICY assignments_admin_insert ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS assignments_admin_update ON public.assignments;
CREATE POLICY assignments_admin_update ON public.assignments
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND assignments.created_by IS NOT NULL
    AND assignments.created_by = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND assignments.created_by = auth.uid()
  );

DROP POLICY IF EXISTS assignments_admin_delete ON public.assignments;
CREATE POLICY assignments_admin_delete ON public.assignments
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND assignments.created_by IS NOT NULL
    AND assignments.created_by = auth.uid()
  );

DROP TRIGGER IF EXISTS trg_assignments_stamp_created_by ON public.assignments;
CREATE TRIGGER trg_assignments_stamp_created_by
  BEFORE INSERT OR UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_content_created_by();

COMMENT ON COLUMN public.assignments.created_by IS
  'User who created the assignment. Set on insert; immutable. Admin may only update/delete own rows.';

/*
 * 4. LESSONS
 * Add created_by; legacy rows (NULL) stay admin read-only.
 */

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_created_by ON public.lessons (created_by)
  WHERE created_by IS NOT NULL;

COMMENT ON COLUMN public.lessons.created_by IS
  'User who created the lesson. NULL on legacy rows = admin read-only until attributed.';

DROP TRIGGER IF EXISTS trg_lessons_stamp_created_by ON public.lessons;
CREATE TRIGGER trg_lessons_stamp_created_by
  BEFORE INSERT OR UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_content_created_by();

DROP POLICY IF EXISTS "Admins update lessons" ON public.lessons;
CREATE POLICY "Admins update lessons" ON public.lessons
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND lessons.created_by IS NOT NULL
    AND lessons.created_by = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND lessons.created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins delete lessons" ON public.lessons;
CREATE POLICY "Admins delete lessons" ON public.lessons
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND lessons.created_by IS NOT NULL
    AND lessons.created_by = auth.uid()
  );

DROP POLICY IF EXISTS lessons_admin_delete ON public.lessons;

/*
 * 5. VIDEOS
 */

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_videos_created_by ON public.videos (created_by)
  WHERE created_by IS NOT NULL;

DROP TRIGGER IF EXISTS trg_videos_stamp_created_by ON public.videos;
CREATE TRIGGER trg_videos_stamp_created_by
  BEFORE INSERT OR UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_content_created_by();

DROP POLICY IF EXISTS "Admins update videos" ON public.videos;
CREATE POLICY "Admins update videos" ON public.videos
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND videos.created_by IS NOT NULL
    AND videos.created_by = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND videos.created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins delete videos" ON public.videos;
CREATE POLICY "Admins delete videos" ON public.videos
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND videos.created_by IS NOT NULL
    AND videos.created_by = auth.uid()
  );

/*
 * 6. FILES
 */

ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_files_created_by ON public.files (created_by)
  WHERE created_by IS NOT NULL;

DROP TRIGGER IF EXISTS trg_files_stamp_created_by ON public.files;
CREATE TRIGGER trg_files_stamp_created_by
  BEFORE INSERT OR UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_content_created_by();

DROP POLICY IF EXISTS "Admins update files" ON public.files;
CREATE POLICY "Admins update files" ON public.files
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND files.created_by IS NOT NULL
    AND files.created_by = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND files.created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins delete files" ON public.files;
CREATE POLICY "Admins delete files" ON public.files
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND files.created_by IS NOT NULL
    AND files.created_by = auth.uid()
  );

/*
 * 7. UNIT_QUIZZES
 */

ALTER TABLE public.unit_quizzes
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_unit_quizzes_created_by ON public.unit_quizzes (created_by)
  WHERE created_by IS NOT NULL;

DROP TRIGGER IF EXISTS trg_unit_quizzes_stamp_created_by ON public.unit_quizzes;
CREATE TRIGGER trg_unit_quizzes_stamp_created_by
  BEFORE INSERT OR UPDATE ON public.unit_quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_content_created_by();

DROP POLICY IF EXISTS "Admins update unit_quizzes" ON public.unit_quizzes;
CREATE POLICY "Admins update unit_quizzes" ON public.unit_quizzes
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND unit_quizzes.created_by IS NOT NULL
    AND unit_quizzes.created_by = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND unit_quizzes.created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins delete unit_quizzes" ON public.unit_quizzes;
CREATE POLICY "Admins delete unit_quizzes" ON public.unit_quizzes
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND unit_quizzes.created_by IS NOT NULL
    AND unit_quizzes.created_by = auth.uid()
  );

DROP POLICY IF EXISTS unit_quizzes_admin_delete ON public.unit_quizzes;

/*
 * 8. LESSON-FILES STORAGE
 * Admin writes only for admin-owned lessons.
 */

DROP POLICY IF EXISTS lesson_files_admin_insert ON storage.objects;
CREATE POLICY lesson_files_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lesson-files'
    AND public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = public.lesson_id_from_lesson_files_path(name)
        AND l.created_by IS NOT NULL
        AND l.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS lesson_files_admin_update ON storage.objects;
CREATE POLICY lesson_files_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'lesson-files'
    AND public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = public.lesson_id_from_lesson_files_path(name)
        AND l.created_by IS NOT NULL
        AND l.created_by = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'lesson-files'
    AND public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = public.lesson_id_from_lesson_files_path(name)
        AND l.created_by IS NOT NULL
        AND l.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS lesson_files_admin_delete ON storage.objects;
CREATE POLICY lesson_files_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'lesson-files'
    AND public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = public.lesson_id_from_lesson_files_path(name)
        AND l.created_by IS NOT NULL
        AND l.created_by = auth.uid()
    )
  );
