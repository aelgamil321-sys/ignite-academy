/*
 * READ ONLY — Admin Content Ownership Verification
 *
 * Project: aijukbdxyawxzekwhrdo
 * Migration: 20260828190000_admin_content_ownership_rls.sql
 *
 * Run manually in Supabase SQL Editor.
 * This file contains SELECT / catalog inspection statements ONLY.
 * It does NOT modify schema, policies, triggers, or data.
 */


/* ==================================================
   1. COLUMNS
   Verify created_by exists on all six content tables.
   ================================================== */

SELECT '1. COLUMNS' AS verification_section;

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'lessons',
    'assignments',
    'articles',
    'files',
    'videos',
    'unit_quizzes'
  )
  AND column_name = 'created_by'
ORDER BY table_name;


/* ==================================================
   2. TRIGGERS
   Ownership stamp triggers + articles_protect_metadata.
   ================================================== */

SELECT '2. TRIGGERS' AS verification_section;

SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
    ELSE t.tgenabled::text
  END AS enabled_state,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND c.relname IN (
    'lessons',
    'assignments',
    'articles',
    'files',
    'videos',
    'unit_quizzes'
  )
  AND (
    t.tgname LIKE '%stamp_created_by%'
    OR p.proname = 'articles_protect_metadata'
    OR p.proname = 'stamp_content_created_by'
  )
ORDER BY c.relname, t.tgname;


/* ==================================================
   2b. TRIGGERS — articles_protect_metadata presence check
   ================================================== */

SELECT '2b. ARTICLES_PROTECT_METADATA CHECK' AS verification_section;

SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  CASE t.tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
    ELSE t.tgenabled::text
  END AS enabled_state,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND c.relname = 'articles'
  AND p.proname = 'articles_protect_metadata'
ORDER BY t.tgname;


/* ==================================================
   3. ADMIN POLICIES
   Inspect admin-related RLS on content tables.
   ================================================== */

SELECT '3. ADMIN POLICIES' AS verification_section;

SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'lessons',
    'assignments',
    'articles',
    'files',
    'videos',
    'unit_quizzes'
  )
  AND (
    policyname ILIKE '%admin%'
    OR policyname ILIKE 'Admins%'
  )
ORDER BY tablename, cmd, policyname;


/* ==================================================
   3b. ADMIN SELECT — broad monitoring policies
   ================================================== */

SELECT '3b. ADMIN SELECT (BROAD MONITORING)' AS verification_section;

SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'lessons',
    'assignments',
    'articles',
    'files',
    'videos',
    'unit_quizzes'
  )
  AND cmd = 'SELECT'
  AND (
    policyname ILIKE '%admin%'
    OR policyname ILIKE 'Admins%'
  )
ORDER BY tablename, policyname;


/* ==================================================
   3c. ADMIN UPDATE/DELETE — ownership-scoped writes
   ================================================== */

SELECT '3c. ADMIN UPDATE/DELETE (OWNERSHIP-SCOPED)' AS verification_section;

SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'lessons',
    'assignments',
    'articles',
    'files',
    'videos',
    'unit_quizzes'
  )
  AND cmd IN ('UPDATE', 'DELETE')
  AND (
    policyname ILIKE '%admin%'
    OR policyname ILIKE 'Admins%'
  )
ORDER BY tablename, cmd, policyname;


/* ==================================================
   4. BROAD POLICY BYPASS
   Named legacy bypass policies that must be absent.
   ================================================== */

SELECT '4a. NAMED BYPASS POLICIES (SHOULD BE EMPTY)' AS verification_section;

SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'lessons_admin_delete',
    'unit_quizzes_admin_delete',
    'assignments_admin_all'
  )
ORDER BY tablename, policyname;


/* ==================================================
   4b. BROAD POLICY BYPASS
   Admin UPDATE/DELETE/ALL without created_by constraint.
   ================================================== */

SELECT '4b. UNRESTRICTED ADMIN WRITE POLICIES (SHOULD BE EMPTY)' AS verification_section;

SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'lessons',
    'assignments',
    'articles',
    'files',
    'videos',
    'unit_quizzes'
  )
  AND cmd IN ('UPDATE', 'DELETE', 'ALL')
  AND (
    policyname ILIKE '%admin%'
    OR policyname ILIKE 'Admins%'
  )
  AND (
    qual IS NULL
    OR (
      qual NOT ILIKE '%created_by%'
      AND qual NOT ILIKE '%auth.uid()%'
    )
  )
ORDER BY tablename, cmd, policyname;


/* ==================================================
   5. TEACHER POLICIES
   Inspection only — list teacher-related policies.
   ================================================== */

SELECT '5. TEACHER POLICIES' AS verification_section;

SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'lessons',
    'assignments',
    'articles',
    'files',
    'videos',
    'unit_quizzes'
  )
  AND (
    policyname ILIKE '%teacher%'
    OR policyname ILIKE 'Teachers%'
  )
ORDER BY tablename, cmd, policyname;


/* ==================================================
   6. LEGACY OWNERSHIP
   Row counts by created_by NULL vs non-NULL.
   ================================================== */

SELECT '6. LEGACY OWNERSHIP COUNTS' AS verification_section;

SELECT
  'lessons' AS table_name,
  count(*) AS total_rows,
  count(*) FILTER (WHERE created_by IS NULL) AS created_by_null,
  count(*) FILTER (WHERE created_by IS NOT NULL) AS created_by_non_null
FROM public.lessons

UNION ALL

SELECT
  'assignments',
  count(*),
  count(*) FILTER (WHERE created_by IS NULL),
  count(*) FILTER (WHERE created_by IS NOT NULL)
FROM public.assignments

UNION ALL

SELECT
  'articles',
  count(*),
  count(*) FILTER (WHERE created_by IS NULL),
  count(*) FILTER (WHERE created_by IS NOT NULL)
FROM public.articles

UNION ALL

SELECT
  'files',
  count(*),
  count(*) FILTER (WHERE created_by IS NULL),
  count(*) FILTER (WHERE created_by IS NOT NULL)
FROM public.files

UNION ALL

SELECT
  'videos',
  count(*),
  count(*) FILTER (WHERE created_by IS NULL),
  count(*) FILTER (WHERE created_by IS NOT NULL)
FROM public.videos

UNION ALL

SELECT
  'unit_quizzes',
  count(*),
  count(*) FILTER (WHERE created_by IS NULL),
  count(*) FILTER (WHERE created_by IS NOT NULL)
FROM public.unit_quizzes

ORDER BY table_name;


/* ==================================================
   7. STORAGE POLICIES
   lesson-files bucket admin policies on storage.objects.
   ================================================== */

SELECT '7. STORAGE POLICIES (lesson_files)' AS verification_section;

SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname ILIKE 'lesson_files%'
ORDER BY policyname, cmd;


/* ==================================================
   8. STORAGE HELPER
   Confirm lesson_id_from_lesson_files_path(text) exists.
   ================================================== */

SELECT '8a. STORAGE HELPER — FUNCTION EXISTS' AS verification_section;

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_catalog.pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'lesson_id_from_lesson_files_path'
ORDER BY arguments;


SELECT '8b. STORAGE HELPER — FUNCTION DEFINITION' AS verification_section;

SELECT
  p.proname AS function_name,
  pg_catalog.pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'lesson_id_from_lesson_files_path'
ORDER BY pg_catalog.pg_get_function_identity_arguments(p.oid);
