-- Teacher announcement targeting: tighten articles INSERT/UPDATE/DELETE for teachers.
-- Normal teachers: grade + section + audience (students/parents) + own-row ownership.
-- Lead teachers (HOD): broader department targeting on INSERT/UPDATE WITH CHECK only.
-- Mutation ownership: ALL teachers (including lead) may UPDATE/DELETE only created_by = auth.uid().
-- Admin policies unchanged. Published read policies unchanged. SELECT for teachers unchanged.

-- ---------------------------------------------------------------------------
-- A. Targeting authorization (grade / section / audience / category)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teacher_can_manage_article_target(
  p_grade text,
  p_target_section text,
  p_audience text,
  p_category text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_section_norm text;
  v_audience text;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'teacher') THEN
    RETURN false;
  END IF;

  IF trim(coalesce(p_grade, '')) = '' THEN
    RETURN false;
  END IF;

  -- Lead teacher (HOD): department-wide targeting preserved (not equivalent to admin).
  IF public.teacher_is_lead_teacher() THEN
    IF coalesce(p_category, '') = 'announcement' THEN
      v_audience := public.normalize_article_audience(p_audience);
      RETURN v_audience IN ('all', 'students', 'teachers', 'parents');
    END IF;
    RETURN true;
  END IF;

  -- Normal teacher: grade must match teacher_assignments scope.
  IF NOT public.teacher_can_manage_lesson_grade(p_grade) THEN
    RETURN false;
  END IF;

  -- Parent guides and other non-announcement articles: grade scope only.
  IF coalesce(p_category, '') IS DISTINCT FROM 'announcement' THEN
    RETURN true;
  END IF;

  -- Announcement audience: class-scoped teachers may target students or parents only.
  v_audience := public.normalize_article_audience(p_audience);
  IF v_audience NOT IN ('students', 'parents') THEN
    RETURN false;
  END IF;

  -- Section targeting (announcements only).
  IF p_target_section IS NULL OR trim(p_target_section) = '' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.teacher_assignments ta
      WHERE ta.teacher_id = v_uid
        AND public.normalize_grade_slug(ta.grade) = public.normalize_grade_slug(p_grade)
        AND ta.section IS NULL
    );
  END IF;

  v_section_norm := public.normalize_profile_section(p_target_section);

  RETURN EXISTS (
    SELECT 1
    FROM public.teacher_assignments ta
    WHERE ta.teacher_id = v_uid
      AND public.normalize_grade_slug(ta.grade) = public.normalize_grade_slug(p_grade)
      AND ta.section IS NOT NULL
      AND ta.section = v_section_norm
  );
END;
$$;

COMMENT ON FUNCTION public.teacher_can_manage_article_target(text, text, text, text) IS
  'Targeting authorization for teacher article INSERT/UPDATE WITH CHECK. Does NOT grant ownership of another user''s content.';

-- ---------------------------------------------------------------------------
-- B. Mutation ownership (separate from targeting; no lead bypass)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teacher_owns_article_row(p_created_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND p_created_by IS NOT NULL
    AND p_created_by = auth.uid();
$$;

COMMENT ON FUNCTION public.teacher_owns_article_row(uuid) IS
  'Teacher mutation ownership: fail-closed when created_by IS NULL; requires created_by = auth.uid(). Applies to all teachers including lead.';

REVOKE ALL ON FUNCTION public.teacher_can_manage_article_target(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_can_manage_article_target(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_manage_article_target(text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.teacher_owns_article_row(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_owns_article_row(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.teacher_owns_article_row(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Teacher article mutation policies (SELECT unchanged)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS articles_teacher_insert ON public.articles;
CREATE POLICY articles_teacher_insert ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.teacher_can_manage_article_target(
      articles.grade,
      articles.target_section,
      articles.audience,
      articles.category
    )
  );

DROP POLICY IF EXISTS articles_teacher_update ON public.articles;
CREATE POLICY articles_teacher_update ON public.articles
  FOR UPDATE TO authenticated
  USING (
    public.teacher_can_manage_article_grade(articles.grade)
    AND public.teacher_owns_article_row(articles.created_by)
  )
  WITH CHECK (
    public.teacher_owns_article_row(articles.created_by)
    AND public.teacher_can_manage_article_target(
      articles.grade,
      articles.target_section,
      articles.audience,
      articles.category
    )
  );

DROP POLICY IF EXISTS articles_teacher_delete ON public.articles;
CREATE POLICY articles_teacher_delete ON public.articles
  FOR DELETE TO authenticated
  USING (
    public.teacher_can_manage_article_grade(articles.grade)
    AND public.teacher_owns_article_row(articles.created_by)
  );
