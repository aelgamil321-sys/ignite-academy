CREATE POLICY "cms_uploads_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'cms-uploads');
CREATE POLICY "cms_uploads_public_insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'cms-uploads');
CREATE POLICY "cms_uploads_public_update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'cms-uploads') WITH CHECK (bucket_id = 'cms-uploads');
CREATE POLICY "cms_uploads_public_delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'cms-uploads');