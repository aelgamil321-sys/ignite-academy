
CREATE TABLE public.unit_information (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade text NOT NULL DEFAULT '',
  unit_slug text NOT NULL DEFAULT '',
  unit jsonb NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  title jsonb NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  description jsonb NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  key_points jsonb NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  notes jsonb NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_information TO anon, authenticated;
GRANT ALL ON public.unit_information TO service_role;
ALTER TABLE public.unit_information ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read unit_information" ON public.unit_information FOR SELECT USING (true);
CREATE POLICY "Public can insert unit_information" ON public.unit_information FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update unit_information" ON public.unit_information FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete unit_information" ON public.unit_information FOR DELETE USING (true);

CREATE TABLE public.unit_quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade text NOT NULL DEFAULT '',
  unit_slug text NOT NULL DEFAULT '',
  unit jsonb NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  title jsonb NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_quizzes TO anon, authenticated;
GRANT ALL ON public.unit_quizzes TO service_role;
ALTER TABLE public.unit_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read unit_quizzes" ON public.unit_quizzes FOR SELECT USING (true);
CREATE POLICY "Public can insert unit_quizzes" ON public.unit_quizzes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update unit_quizzes" ON public.unit_quizzes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public can delete unit_quizzes" ON public.unit_quizzes FOR DELETE USING (true);
