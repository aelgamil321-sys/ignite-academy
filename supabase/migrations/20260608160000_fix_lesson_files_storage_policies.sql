-- Fix lesson-files bucket: public reads for students, admin-only writes.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lesson-files', 'lesson-files', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS lesson_files_admin_select ON storage.objects;
DROP POLICY IF EXISTS lesson_files_admin_insert ON storage.objects;
DROP POLICY IF EXISTS lesson_files_admin_update ON storage.objects;
DROP POLICY IF EXISTS lesson_files_admin_delete ON storage.objects;
DROP POLICY IF EXISTS lesson_files_public_read ON storage.objects;

-- Students (anon + authenticated) can download lesson files via public URLs.
CREATE POLICY lesson_files_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'lesson-files');

-- Admins can upload and manage lesson files.
CREATE POLICY lesson_files_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lesson-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY lesson_files_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lesson-files' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'lesson-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY lesson_files_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-files' AND public.has_role(auth.uid(), 'admin'));
