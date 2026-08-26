-- Articles already have grade + unit_slug columns (20260606134949).
-- Replace lead-teacher-only article policies with grade-scoped teacher access.

CREATE OR REPLACE FUNCTION public.teacher_can_manage_article_grade(p_grade text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher')
    AND (
      public.teacher_is_lead_teacher()
      OR (
        trim(COALESCE(p_grade, '')) <> ''
        AND public.teacher_can_manage_lesson_grade(p_grade)
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_can_manage_article_grade(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_manage_article_grade(text) TO authenticated;

DROP POLICY IF EXISTS articles_teacher_select ON public.articles;
CREATE POLICY articles_teacher_select ON public.articles
  FOR SELECT TO authenticated
  USING (public.teacher_can_manage_article_grade(articles.grade));

DROP POLICY IF EXISTS articles_teacher_insert ON public.articles;
CREATE POLICY articles_teacher_insert ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (public.teacher_can_manage_article_grade(articles.grade));

DROP POLICY IF EXISTS articles_teacher_update ON public.articles;
CREATE POLICY articles_teacher_update ON public.articles
  FOR UPDATE TO authenticated
  USING (public.teacher_can_manage_article_grade(articles.grade))
  WITH CHECK (public.teacher_can_manage_article_grade(articles.grade));

DROP POLICY IF EXISTS articles_teacher_delete ON public.articles;
CREATE POLICY articles_teacher_delete ON public.articles
  FOR DELETE TO authenticated
  USING (public.teacher_can_manage_article_grade(articles.grade));
