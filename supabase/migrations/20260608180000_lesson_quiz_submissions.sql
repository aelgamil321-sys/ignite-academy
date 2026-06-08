-- Phase 1: lesson quiz submissions (questions stay in lessons.quiz JSONB)

CREATE TABLE IF NOT EXISTS public.lesson_quiz_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  total_points NUMERIC NOT NULL DEFAULT 0,
  percentage NUMERIC NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_quiz_submissions_lesson
  ON public.lesson_quiz_submissions(lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_quiz_submissions_student
  ON public.lesson_quiz_submissions(student_id);

CREATE INDEX IF NOT EXISTS idx_lesson_quiz_submissions_student_lesson
  ON public.lesson_quiz_submissions(student_id, lesson_id);

ALTER TABLE public.lesson_quiz_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lesson_quiz_submissions_insert ON public.lesson_quiz_submissions;
DROP POLICY IF EXISTS lesson_quiz_submissions_select_own ON public.lesson_quiz_submissions;
DROP POLICY IF EXISTS lesson_quiz_submissions_admin_select ON public.lesson_quiz_submissions;

CREATE POLICY lesson_quiz_submissions_insert ON public.lesson_quiz_submissions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY lesson_quiz_submissions_select_own ON public.lesson_quiz_submissions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY lesson_quiz_submissions_admin_select ON public.lesson_quiz_submissions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT ON public.lesson_quiz_submissions TO authenticated;
GRANT ALL ON public.lesson_quiz_submissions TO service_role;
