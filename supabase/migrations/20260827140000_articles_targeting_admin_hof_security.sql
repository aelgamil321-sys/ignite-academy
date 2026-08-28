-- Articles: creator + targeting fields, RLS hardening, immutable created_by,
-- admin-only RPCs (Hall of Fame + announcement creator display names).

-- ---------------------------------------------------------------------------
-- 1. Schema: nullable targeting columns (legacy rows remain valid)
-- ---------------------------------------------------------------------------

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_section text,
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS announcement_topic text;

ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_target_section_check;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_target_section_check
  CHECK (
    target_section IS NULL
    OR target_section IN ('A', 'B', 'C', 'D', 'E', 'F')
  );

ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_audience_check;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_audience_check
  CHECK (
    audience IS NULL
    OR audience IN ('all', 'students', 'teachers', 'parents')
  );

ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_announcement_topic_check;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_announcement_topic_check
  CHECK (
    announcement_topic IS NULL
    OR announcement_topic IN ('school_news', 'exams', 'events', 'parents')
  );

CREATE INDEX IF NOT EXISTS idx_articles_created_by ON public.articles (created_by)
  WHERE created_by IS NOT NULL;

COMMENT ON COLUMN public.articles.created_by IS 'Authenticated user who created the article (set by trigger on insert; immutable on update).';
COMMENT ON COLUMN public.articles.target_section IS 'Optional student section target (A–F); NULL = all sections in grade. Enforced by articles RLS for announcement reads.';
COMMENT ON COLUMN public.articles.audience IS 'Intended audience: all, students, teachers, parents. NULL legacy = all. Enforced by articles RLS for announcement reads.';
COMMENT ON COLUMN public.articles.announcement_topic IS 'Announcement topic category (school_news, exams, events, parents).';

-- ---------------------------------------------------------------------------
-- 2. created_by immutability + section normalization (server-controlled)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.articles_protect_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.created_by := auth.uid();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;
  END IF;

  IF NEW.target_section IS NOT NULL AND trim(NEW.target_section) <> '' THEN
    NEW.target_section := public.normalize_profile_section(NEW.target_section);
  ELSE
    NEW.target_section := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.articles_protect_metadata() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.articles_protect_metadata() TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_articles_set_created_by ON public.articles;
DROP TRIGGER IF EXISTS trg_articles_protect_metadata ON public.articles;
CREATE TRIGGER trg_articles_protect_metadata
  BEFORE INSERT OR UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.articles_protect_metadata();

-- ---------------------------------------------------------------------------
-- 3. Audience + grade/section visibility helpers (announcement reads)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_article_audience(p_audience text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_audience IS NULL OR trim(p_audience) = '' THEN 'all'
    ELSE lower(trim(p_audience))
  END;
$$;

CREATE OR REPLACE FUNCTION public.article_has_grade_section_targeting(
  p_grade text,
  p_target_section text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(coalesce(p_grade, '')) <> '' OR p_target_section IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.article_matches_profile_grade_section(
  p_article_grade text,
  p_target_section text,
  p_profile_grade text,
  p_profile_section text
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    (
      trim(coalesce(p_article_grade, '')) = ''
      OR public.normalize_grade_slug(p_article_grade) = public.normalize_grade_slug(p_profile_grade)
    )
    AND (
      p_target_section IS NULL
      OR trim(p_target_section) = ''
      OR public.normalize_profile_section(p_target_section) = public.normalize_profile_section(p_profile_section)
    );
$$;

CREATE OR REPLACE FUNCTION public.article_matches_caller_student_profile(
  p_user_id uuid,
  p_article_grade text,
  p_target_section text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grade text;
  v_section text;
BEGIN
  SELECT trim(p.grade), p.section
  INTO v_grade, v_section
  FROM public.profiles p
  WHERE p.user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN public.article_matches_profile_grade_section(
    p_article_grade, p_target_section, v_grade, v_section
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.parent_matches_article_targeting(
  p_parent_id uuid,
  p_article_grade text,
  p_target_section text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.article_has_grade_section_targeting(p_article_grade, p_target_section) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.parent_student_links psl
      INNER JOIN public.profiles p ON p.user_id = psl.student_user_id
      WHERE psl.parent_user_id = p_parent_id
        AND public.article_matches_profile_grade_section(
          p_article_grade, p_target_section, p.grade, p.section
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.parent_profiles pp
      INNER JOIN public.profiles p ON public.parent_matches_student_profile(pp, p)
      WHERE pp.user_id = p_parent_id
        AND public.article_matches_profile_grade_section(
          p_article_grade, p_target_section, p.grade, p.section
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.parent_student_links psl
          WHERE psl.parent_user_id = pp.user_id
        )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.anon_can_read_published_article(
  p_category text,
  p_audience text,
  p_grade text,
  p_target_section text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audience text;
BEGIN
  IF p_category IS DISTINCT FROM 'announcement' THEN
    RETURN true;
  END IF;

  v_audience := public.normalize_article_audience(p_audience);

  IF v_audience <> 'all' THEN
    RETURN false;
  END IF;

  RETURN NOT public.article_has_grade_section_targeting(p_grade, p_target_section);
END;
$$;

CREATE OR REPLACE FUNCTION public.authenticated_can_read_published_article(
  p_category text,
  p_audience text,
  p_grade text,
  p_target_section text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_audience text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  IF p_category IS DISTINCT FROM 'announcement' THEN
    RETURN true;
  END IF;

  v_audience := public.normalize_article_audience(p_audience);

  IF public.has_role(v_uid, 'admin') THEN
    RETURN true;
  END IF;

  IF public.has_role(v_uid, 'teacher') THEN
    RETURN v_audience IN ('all', 'teachers');
  END IF;

  IF public.has_role(v_uid, 'student') THEN
    IF v_audience NOT IN ('all', 'students') THEN
      RETURN false;
    END IF;
    RETURN public.article_matches_caller_student_profile(v_uid, p_grade, p_target_section);
  END IF;

  IF public.has_role(v_uid, 'parent') THEN
    IF v_audience NOT IN ('all', 'parents') THEN
      RETURN false;
    END IF;
    RETURN public.parent_matches_article_targeting(v_uid, p_grade, p_target_section);
  END IF;

  RETURN v_audience = 'all'
    AND NOT public.article_has_grade_section_targeting(p_grade, p_target_section);
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_article_audience(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.article_has_grade_section_targeting(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.article_matches_profile_grade_section(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.article_matches_caller_student_profile(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.parent_matches_article_targeting(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.anon_can_read_published_article(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.authenticated_can_read_published_article(text, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.normalize_article_audience(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.article_has_grade_section_targeting(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.article_matches_profile_grade_section(text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.article_matches_caller_student_profile(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.parent_matches_article_targeting(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.anon_can_read_published_article(text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.authenticated_can_read_published_article(text, text, text, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Articles RLS — remove permissive public write; audience-aware published read
-- ---------------------------------------------------------------------------

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Legacy permissive policies (from early bootstrap migration)
DROP POLICY IF EXISTS "Public can read articles" ON public.articles;
DROP POLICY IF EXISTS "Public can insert articles" ON public.articles;
DROP POLICY IF EXISTS "Public can update articles" ON public.articles;
DROP POLICY IF EXISTS "Public can delete articles" ON public.articles;

DROP POLICY IF EXISTS "Anyone reads published articles" ON public.articles;
DROP POLICY IF EXISTS articles_anon_published_select ON public.articles;
CREATE POLICY articles_anon_published_select ON public.articles
  FOR SELECT TO anon
  USING (
    published = true
    AND public.anon_can_read_published_article(
      category, audience, grade, target_section
    )
  );

DROP POLICY IF EXISTS articles_auth_published_audience_select ON public.articles;
CREATE POLICY articles_auth_published_audience_select ON public.articles
  FOR SELECT TO authenticated
  USING (
    published = true
    AND public.authenticated_can_read_published_article(
      category, audience, grade, target_section
    )
  );

DROP POLICY IF EXISTS "Admins read all articles" ON public.articles;
CREATE POLICY "Admins read all articles" ON public.articles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert articles" ON public.articles;
CREATE POLICY "Admins insert articles" ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update articles" ON public.articles;
CREATE POLICY "Admins update articles" ON public.articles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete articles" ON public.articles;
CREATE POLICY "Admins delete articles" ON public.articles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Teacher grade-scoped policies (from 20260703120000) — unchanged rules, re-assert names
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

GRANT SELECT ON public.articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Admin-only Hall of Fame RPC (section + user_id for admin filters)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_admin_hall_of_fame()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_top_students jsonb;
  v_student_of_month jsonb;
  v_grade_champions jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  WITH admin_users AS (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
  ),
  submission_avg AS (
    SELECT
      lqs.student_id AS user_id,
      ROUND(AVG(lqs.percentage))::int AS avg_score
    FROM public.lesson_quiz_submissions lqs
    GROUP BY lqs.student_id
  ),
  cert_counts AS (
    SELECT
      qc.student_id AS user_id,
      COUNT(*)::int AS cert_count
    FROM public.quiz_certificates qc
    GROUP BY qc.student_id
  ),
  student_perf AS (
    SELECT
      p.user_id,
      NULLIF(trim(COALESCE(p.arabic_name, '')), '') AS arabic_name,
      NULLIF(trim(p.grade), '') AS grade,
      public.normalize_profile_section(p.section) AS section,
      public.normalize_profile_islamic_group(p.islamic_group) AS islamic_group,
      p.profile_photo_path,
      sa.avg_score,
      COALESCE(cc.cert_count, 0) AS cert_count
    FROM public.profiles p
    INNER JOIN submission_avg sa ON sa.user_id = p.user_id
    LEFT JOIN cert_counts cc ON cc.user_id = p.user_id
    WHERE p.user_id NOT IN (SELECT user_id FROM admin_users)
  ),
  ranked AS (
    SELECT
      sp.*,
      ROW_NUMBER() OVER (
        ORDER BY sp.avg_score DESC, sp.cert_count DESC, sp.user_id
      )::int AS rn
    FROM student_perf sp
  ),
  top_ten AS (
    SELECT *
    FROM ranked
    WHERE rn <= 10
    ORDER BY rn
  ),
  grade_ranked AS (
    SELECT
      sp.*,
      ROW_NUMBER() OVER (
        PARTITION BY sp.grade
        ORDER BY sp.avg_score DESC, sp.cert_count DESC, sp.user_id
      )::int AS grade_rn
    FROM student_perf sp
    WHERE sp.grade IS NOT NULL
  )
  SELECT
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', t.user_id,
            'arabic_name', COALESCE(t.arabic_name, '—'),
            'grade', t.grade,
            'section', t.section,
            'islamic_group', t.islamic_group,
            'profile_photo_path', t.profile_photo_path,
            'average_score_pct', t.avg_score,
            'certificates_earned', t.cert_count
          )
          ORDER BY t.rn
        )
        FROM top_ten t
      ),
      '[]'::jsonb
    ),
    (
      SELECT jsonb_build_object(
        'user_id', r.user_id,
        'arabic_name', COALESCE(r.arabic_name, '—'),
        'grade', r.grade,
        'section', r.section,
        'islamic_group', r.islamic_group,
        'profile_photo_path', r.profile_photo_path,
        'average_score_pct', r.avg_score,
        'certificates_earned', r.cert_count
      )
      FROM ranked r
      WHERE r.rn = 1
      LIMIT 1
    ),
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'user_id', gr.user_id,
            'grade', gr.grade,
            'section', gr.section,
            'arabic_name', COALESCE(gr.arabic_name, '—'),
            'profile_photo_path', gr.profile_photo_path,
            'average_score_pct', gr.avg_score,
            'islamic_group', gr.islamic_group,
            'certificates_earned', gr.cert_count
          )
          ORDER BY gr.grade
        )
        FROM grade_ranked gr
        WHERE gr.grade_rn = 1
      ),
      '[]'::jsonb
    )
  INTO v_top_students, v_student_of_month, v_grade_champions;

  RETURN jsonb_build_object(
    'top_students', v_top_students,
    'student_of_month', v_student_of_month,
    'grade_champions', v_grade_champions
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_hall_of_fame() IS
  'Admin-only Hall of Fame rankings with section and user_id. SECURITY DEFINER bypasses profiles RLS to aggregate student performance; caller must be admin (enforced inside).';

REVOKE ALL ON FUNCTION public.get_admin_hall_of_fame() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_hall_of_fame() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_hall_of_fame() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Admin-only announcement creator display names (no email exposure)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_announcement_creator_display_names(p_user_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  IF p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(
      p.user_id::text,
      COALESCE(
        NULLIF(trim(p.full_name), ''),
        NULLIF(trim(p.english_name), ''),
        NULLIF(trim(p.arabic_name), ''),
        '—'
      )
    ),
    '{}'::jsonb
  )
  INTO v_result
  FROM public.profiles p
  WHERE p.user_id = ANY (p_user_ids);

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_announcement_creator_display_names(uuid[]) IS
  'Admin-only display names for announcement creators. Returns {user_id: name} without email or other private fields.';

REVOKE ALL ON FUNCTION public.get_announcement_creator_display_names(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_announcement_creator_display_names(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_announcement_creator_display_names(uuid[]) TO authenticated;
