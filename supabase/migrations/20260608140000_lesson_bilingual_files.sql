-- Bilingual lesson file URL columns (keep existing pdf_url, ppt_url, worksheet_url columns)
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS ppt_ar_url text,
  ADD COLUMN IF NOT EXISTS ppt_en_url text,
  ADD COLUMN IF NOT EXISTS worksheet_ar_url text,
  ADD COLUMN IF NOT EXISTS worksheet_en_url text,
  ADD COLUMN IF NOT EXISTS pdf_ar_url text,
  ADD COLUMN IF NOT EXISTS pdf_en_url text;

-- Private bucket for lesson attachments (access via signed URLs stored on lessons rows)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-files', 'lesson-files', false)
ON CONFLICT (id) DO NOTHING;

-- Admin: full control over lesson-files bucket
CREATE POLICY lesson_files_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-files' AND public.has_role(auth.uid(), 'admin'));

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
