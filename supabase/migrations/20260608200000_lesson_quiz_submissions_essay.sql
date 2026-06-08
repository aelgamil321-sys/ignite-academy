-- Essay quiz support: scoring columns + admin review on lesson_quiz_submissions

ALTER TABLE public.lesson_quiz_submissions
  ADD COLUMN IF NOT EXISTS auto_score NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS essay_score NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_score NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'reviewed'
    CHECK (status IN ('pending_review', 'reviewed'));

UPDATE public.lesson_quiz_submissions
SET
  auto_score = score,
  final_score = score,
  essay_score = 0,
  status = 'reviewed'
WHERE auto_score = 0 AND final_score = 0 AND essay_score = 0;

DROP POLICY IF EXISTS lesson_quiz_submissions_admin_update ON public.lesson_quiz_submissions;

CREATE POLICY lesson_quiz_submissions_admin_update ON public.lesson_quiz_submissions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT UPDATE ON public.lesson_quiz_submissions TO authenticated;
