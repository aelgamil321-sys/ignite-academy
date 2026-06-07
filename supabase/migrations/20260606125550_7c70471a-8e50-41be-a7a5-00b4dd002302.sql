
-- Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade TEXT NOT NULL,
  unit JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  title JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  outcome JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  explanation JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  vocab JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  activity JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  youtube_url TEXT NOT NULL DEFAULT '',
  pdf_url TEXT, pdf_name TEXT,
  ppt_url TEXT, ppt_name TEXT,
  worksheet_url TEXT, worksheet_name TEXT,
  quiz JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO anon, authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Public can insert lessons" ON public.lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update lessons" ON public.lessons FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete lessons" ON public.lessons FOR DELETE USING (true);

-- Videos
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  description JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  grade TEXT NOT NULL DEFAULT '',
  unit JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  youtube_url TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO anon, authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read videos" ON public.videos FOR SELECT USING (true);
CREATE POLICY "Public can insert videos" ON public.videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update videos" ON public.videos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete videos" ON public.videos FOR DELETE USING (true);

-- Files (resources)
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  grade TEXT NOT NULL DEFAULT '',
  unit JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  lesson TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'pdf',
  file_url TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO anon, authenticated;
GRANT ALL ON public.files TO service_role;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read files" ON public.files FOR SELECT USING (true);
CREATE POLICY "Public can insert files" ON public.files FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update files" ON public.files FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete files" ON public.files FOR DELETE USING (true);

-- Articles (announcements + parent guides)
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  content JSONB NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  category TEXT NOT NULL DEFAULT 'announcement',
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO anon, authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read articles" ON public.articles FOR SELECT USING (true);
CREATE POLICY "Public can insert articles" ON public.articles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update articles" ON public.articles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete articles" ON public.articles FOR DELETE USING (true);
