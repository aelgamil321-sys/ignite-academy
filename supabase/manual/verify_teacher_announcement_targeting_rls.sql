/*
 * READ ONLY — Teacher Announcement Targeting RLS Verification
 *
 * Migration: 20260829120000_teacher_announcement_targeting_rls.sql
 *
 * Inspects policy/function definitions and documents expected PASS/FAIL behavior.
 * Does NOT impersonate auth users or mutate data.
 *
 * Run manually in Supabase SQL Editor after applying the migration.
 */

-- ---------------------------------------------------------------------------
-- 1. Helper functions exist
-- ---------------------------------------------------------------------------

SELECT
  1 AS check_no,
  'teacher_can_manage_article_target function' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'teacher_can_manage_article_target'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'Targeting authorization helper (grade, section, audience, category)' AS details
UNION ALL
SELECT
  2,
  'teacher_owns_article_row function',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'teacher_owns_article_row'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'Mutation ownership helper: created_by IS NOT NULL AND created_by = auth.uid()';

-- ---------------------------------------------------------------------------
-- 2. Teacher mutation policies
-- ---------------------------------------------------------------------------

WITH policy_exprs AS (
  SELECT
    pol.polname,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'articles'
    AND pol.polname IN (
      'articles_teacher_insert',
      'articles_teacher_update',
      'articles_teacher_delete',
      'articles_teacher_select'
    )
)
SELECT
  3 AS check_no,
  'articles_teacher_insert uses targeting helper' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM policy_exprs
      WHERE polname = 'articles_teacher_insert'
        AND coalesce(with_check_expr, '') ILIKE '%teacher_can_manage_article_target%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'INSERT WITH CHECK must call teacher_can_manage_article_target' AS details
UNION ALL
SELECT
  4,
  'articles_teacher_update uses ownership helper (no lead bypass)',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM policy_exprs
      WHERE polname = 'articles_teacher_update'
        AND coalesce(using_expr, '') ILIKE '%teacher_owns_article_row%'
        AND coalesce(with_check_expr, '') ILIKE '%teacher_owns_article_row%'
        AND coalesce(using_expr, '') NOT ILIKE '%teacher_is_lead_teacher%'
        AND coalesce(with_check_expr, '') NOT ILIKE '%teacher_is_lead_teacher%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'UPDATE requires teacher_owns_article_row on USING and WITH CHECK; lead cannot bypass'
UNION ALL
SELECT
  5,
  'articles_teacher_delete uses ownership helper (no lead bypass)',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM policy_exprs
      WHERE polname = 'articles_teacher_delete'
        AND coalesce(using_expr, '') ILIKE '%teacher_owns_article_row%'
        AND coalesce(using_expr, '') NOT ILIKE '%teacher_is_lead_teacher%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'DELETE requires teacher_owns_article_row; lead cannot bypass'
UNION ALL
SELECT
  6,
  'articles_teacher_select unchanged (grade scope monitoring)',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM policy_exprs
      WHERE polname = 'articles_teacher_select'
        AND coalesce(using_expr, '') ILIKE '%teacher_can_manage_article_grade%'
        AND coalesce(using_expr, '') NOT ILIKE '%created_by%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'Teachers and leads may read grade-scoped articles (not own-only)';

-- ---------------------------------------------------------------------------
-- 3. No broad teacher mutation bypass policies
-- ---------------------------------------------------------------------------

SELECT
  7 AS check_no,
  'No extra teacher UPDATE/DELETE policies on articles' AS check_name,
  CASE
    WHEN (
      SELECT count(*)::int
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'articles'
        AND pol.polcmd IN ('w', 'd')
        AND pol.polname ILIKE '%teacher%'
    ) = 2 THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'Exactly articles_teacher_update and articles_teacher_delete (permissive OR cannot bypass ownership)' AS details;

-- ---------------------------------------------------------------------------
-- 4. Admin + published read policies still present (not weakened)
-- ---------------------------------------------------------------------------

SELECT
  8 AS check_no,
  'Admin article policies preserved' AS check_name,
  CASE
    WHEN (
      SELECT count(*)::int
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'articles'
        AND pol.polname IN (
          'Admins read all articles',
          'Admins insert articles',
          'Admins update articles',
          'Admins delete articles'
        )
    ) = 4 THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'Four admin policies must remain on public.articles' AS details
UNION ALL
SELECT
  9,
  'Published audience read policies preserved',
  CASE
    WHEN (
      SELECT count(*)::int
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'articles'
        AND pol.polname IN (
          'articles_anon_published_select',
          'articles_auth_published_audience_select'
        )
    ) = 2 THEN 'PASS'
    ELSE 'FAIL'
  END,
  'Anon/authenticated published read policies unchanged by this migration';

-- ---------------------------------------------------------------------------
-- 5. Expected behavioral matrix (documentation — not executed as live tests)
-- ---------------------------------------------------------------------------

SELECT *
FROM (
  VALUES
    (10, 'PASS', 'Normal teacher', 'INSERT announcement: assigned grade + assigned section + audience students'),
    (11, 'PASS', 'Normal teacher', 'INSERT announcement: assigned grade + assigned section + audience parents'),
    (12, 'PASS', 'Normal teacher', 'INSERT announcement: grade-wide (target_section NULL) when assignment.section IS NULL'),
    (13, 'PASS', 'Normal teacher', 'UPDATE own valid announcement'),
    (14, 'PASS', 'Normal teacher', 'DELETE own announcement'),
    (15, 'PASS', 'Lead teacher', 'INSERT broader department announcement (all/students/teachers/parents audiences)'),
    (16, 'PASS', 'Lead teacher', 'SELECT/monitor grade-scoped teacher announcements'),
    (17, 'PASS', 'Admin', 'INSERT/UPDATE/DELETE any targeting (admin policies separate)'),
    (20, 'FAIL', 'Normal teacher', 'INSERT announcement: unassigned grade'),
    (21, 'FAIL', 'Normal teacher', 'INSERT announcement: assigned grade but unassigned section'),
    (22, 'FAIL', 'Section-specific teacher', 'INSERT announcement: target_section NULL (whole grade)'),
    (23, 'FAIL', 'Normal teacher', 'INSERT announcement: audience all'),
    (24, 'FAIL', 'Normal teacher', 'INSERT announcement: audience teachers'),
    (25, 'FAIL', 'Normal teacher', 'UPDATE another teacher''s article (created_by <> auth.uid())'),
    (26, 'FAIL', 'Normal teacher', 'DELETE another teacher''s article'),
    (27, 'FAIL', 'Lead teacher', 'UPDATE another teacher''s article'),
    (28, 'FAIL', 'Lead teacher', 'DELETE another teacher''s article'),
    (29, 'FAIL', 'Normal teacher', 'UPDATE legacy article with created_by IS NULL'),
    (30, 'FAIL', 'Lead teacher', 'UPDATE legacy article with created_by IS NULL'),
    (31, 'FAIL', 'Normal teacher', 'DELETE legacy article with created_by IS NULL'),
    (32, 'FAIL', 'Lead teacher', 'DELETE legacy article with created_by IS NULL')
) AS expected(check_no, expected_result, actor, scenario)
ORDER BY check_no;

/*
 * LIMITATIONS:
 * - Rows 10–32 are documented expectations derived from function/policy source.
 * - Live PASS/FAIL per user requires SET ROLE / JWT claims in a writable test session.
 * - Islamic group is NOT an article targeting column; assignments.islamic_group is ignored here.
 * - Legacy rows with audience=all created by teachers before this migration are not rewritten.
 * - Targeting helper grants lead broader INSERT targeting; ownership helper never grants peer mutation.
 */
