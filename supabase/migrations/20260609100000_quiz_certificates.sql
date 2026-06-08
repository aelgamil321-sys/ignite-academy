-- Quiz completion certificates (issued after reviewed quiz or auto-graded quiz)

CREATE TABLE IF NOT EXISTS public.quiz_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id TEXT NOT NULL UNIQUE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL UNIQUE REFERENCES public.lesson_quiz_submissions(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_certificates_student
  ON public.quiz_certificates(student_id);

CREATE INDEX IF NOT EXISTS idx_quiz_certificates_lesson
  ON public.quiz_certificates(lesson_id);

ALTER TABLE public.quiz_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_certificates_insert_own ON public.quiz_certificates;
DROP POLICY IF EXISTS quiz_certificates_select_own ON public.quiz_certificates;
DROP POLICY IF EXISTS quiz_certificates_admin_select ON public.quiz_certificates;

CREATE POLICY quiz_certificates_insert_own ON public.quiz_certificates
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY quiz_certificates_select_own ON public.quiz_certificates
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY quiz_certificates_admin_select ON public.quiz_certificates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT ON public.quiz_certificates TO authenticated;
GRANT ALL ON public.quiz_certificates TO service_role;
