/*
 * READ ONLY — Teacher Timetable Security Verification
 *
 * Migration: 20260829140000_teacher_timetables.sql
 *
 * Inspects table design, RLS policies, storage policies, constraints, and
 * parsed_schedule protection assumptions.
 * Does NOT impersonate auth users or mutate data.
 *
 * Run manually in Supabase SQL Editor AFTER applying the migration.
 */

-- ---------------------------------------------------------------------------
-- 1. Table exists with expected design
-- ---------------------------------------------------------------------------

SELECT
  1 AS check_no,
  'teacher_timetables table exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'teacher_timetables'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'Core timetable metadata table' AS details
UNION ALL
SELECT
  2,
  'teacher_id UNIQUE (one timetable per teacher)',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'teacher_timetables'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ILIKE '%teacher_id%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'Enforces one current timetable row per teacher'
UNION ALL
SELECT
  3,
  'parsed_schedule column nullable',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'teacher_timetables'
        AND column_name = 'parsed_schedule'
        AND is_nullable = 'YES'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'Future AI field optional/null for current uploads';

-- ---------------------------------------------------------------------------
-- 2. RLS enabled
-- ---------------------------------------------------------------------------

SELECT
  4 AS check_no,
  'RLS enabled on teacher_timetables' AS check_name,
  CASE
    WHEN c.relrowsecurity THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'Row level security must be enabled' AS details
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'teacher_timetables';

-- ---------------------------------------------------------------------------
-- 3. Ownership policies (teacher own-only; admin read-only on table)
-- ---------------------------------------------------------------------------

WITH policy_exprs AS (
  SELECT
    pol.polname,
    pol.polcmd,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'teacher_timetables'
)
SELECT
  5 AS check_no,
  'teacher_timetables_select own-or-admin' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM policy_exprs
      WHERE polname = 'teacher_timetables_select'
        AND coalesce(using_expr, '') ILIKE '%teacher_id = auth.uid()%'
        AND coalesce(using_expr, '') ILIKE '%has_role%admin%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'Teachers read own row; admin read convention preserved' AS details
UNION ALL
SELECT
  6,
  'teacher_timetables_insert own-only',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM policy_exprs
      WHERE polname = 'teacher_timetables_insert'
        AND coalesce(with_check_expr, '') ILIKE '%teacher_id = auth.uid()%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'INSERT must stamp/check teacher_id = auth.uid()'
UNION ALL
SELECT
  7,
  'teacher_timetables_insert parsed_schedule null',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM policy_exprs
      WHERE polname = 'teacher_timetables_insert'
        AND coalesce(with_check_expr, '') ILIKE '%parsed_schedule IS NULL%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'Teachers cannot insert parsed_schedule via RLS'
UNION ALL
SELECT
  8,
  'teacher_timetables_update own-only',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM policy_exprs
      WHERE polname = 'teacher_timetables_update'
        AND coalesce(using_expr, '') ILIKE '%teacher_id = auth.uid()%'
        AND coalesce(with_check_expr, '') ILIKE '%teacher_id = auth.uid()%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'UPDATE scoped to own row only'
UNION ALL
SELECT
  9,
  'teacher_timetables_delete own-only',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM policy_exprs
      WHERE polname = 'teacher_timetables_delete'
        AND coalesce(using_expr, '') ILIKE '%teacher_id = auth.uid()%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'DELETE scoped to own row only'
UNION ALL
SELECT
  10,
  'No lead-teacher peer timetable policy',
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM policy_exprs
      WHERE coalesce(using_expr, '') ILIKE '%lead%'
         OR coalesce(with_check_expr, '') ILIKE '%lead%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'Lead/HOD must not gain peer timetable access via table policies';

-- ---------------------------------------------------------------------------
-- 4. Constraints: path ownership, MIME, size
-- ---------------------------------------------------------------------------

SELECT
  11 AS check_no,
  'storage_path owner prefix CHECK' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'teacher_timetables'
        AND c.conname = 'teacher_timetables_storage_path_owner_chk'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'storage_path must start with teacher_id/' AS details
UNION ALL
SELECT
  12,
  'mime_type allowlist CHECK',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'teacher_timetables'
        AND c.conname = 'teacher_timetables_mime_type_chk'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'PDF/JPEG/PNG/WebP only at DB layer'
UNION ALL
SELECT
  13,
  'file_size <= 10MB CHECK',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'teacher_timetables'
        AND c.conname = 'teacher_timetables_file_size_chk'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  '10 MB max enforced in table metadata';

-- ---------------------------------------------------------------------------
-- 5. parsed_schedule protection trigger
-- ---------------------------------------------------------------------------

SELECT
  14 AS check_no,
  'parsed_schedule guard trigger exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'teacher_timetables'
        AND tg.tgname = 'teacher_timetables_guard_parsed_schedule'
        AND NOT tg.tgisinternal
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'Trigger blocks teacher client writes to parsed_schedule' AS details
UNION ALL
SELECT
  15,
  'parsed_schedule guard function exists',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'teacher_timetables_guard_parsed_schedule'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'service_role may write parsed_schedule; authenticated cannot';

-- ---------------------------------------------------------------------------
-- 5b. updated_at trigger
-- ---------------------------------------------------------------------------

SELECT
  23 AS check_no,
  'updated_at trigger exists' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'teacher_timetables'
        AND tg.tgname = 'teacher_timetables_set_updated_at'
        AND NOT tg.tgisinternal
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'updated_at maintained on row updates' AS details;

-- ---------------------------------------------------------------------------
-- 6. Storage bucket + policies
-- ---------------------------------------------------------------------------

SELECT
  16 AS check_no,
  'teacher-timetables bucket exists (private)' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM storage.buckets
      WHERE id = 'teacher-timetables'
        AND public = false
        AND file_size_limit = 10485760
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'Private bucket with 10MB limit' AS details
UNION ALL
SELECT
  17,
  'bucket allowed_mime_types restricted',
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM storage.buckets
      WHERE id = 'teacher-timetables'
        AND allowed_mime_types @> ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
        AND cardinality(allowed_mime_types) = 4
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'Storage MIME allowlist at bucket level';

WITH storage_policy_exprs AS (
  SELECT
    pol.polname,
    pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
    pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'storage'
    AND c.relname = 'objects'
    AND pol.polname LIKE 'teacher_timetables_storage_%'
)
SELECT
  18 AS check_no,
  'storage SELECT own-folder only' AS check_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM storage_policy_exprs
      WHERE polname = 'teacher_timetables_storage_select'
        AND coalesce(using_expr, '') ILIKE '%teacher-timetables%'
        AND coalesce(using_expr, '') ILIKE '%foldername%auth.uid()%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'Path prefix must match auth.uid()' AS details
UNION ALL
SELECT
  19,
  'storage INSERT own-folder only',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM storage_policy_exprs
      WHERE polname = 'teacher_timetables_storage_insert'
        AND coalesce(with_check_expr, '') ILIKE '%teacher-timetables%'
        AND coalesce(with_check_expr, '') ILIKE '%foldername%auth.uid()%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'Upload path must be under own folder'
UNION ALL
SELECT
  20,
  'storage UPDATE own-folder only',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM storage_policy_exprs
      WHERE polname = 'teacher_timetables_storage_update'
        AND coalesce(using_expr, '') ILIKE '%foldername%auth.uid()%'
        AND coalesce(with_check_expr, '') ILIKE '%foldername%auth.uid()%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'Cannot update objects in another teacher folder'
UNION ALL
SELECT
  21,
  'storage DELETE own-folder only',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM storage_policy_exprs
      WHERE polname = 'teacher_timetables_storage_delete'
        AND coalesce(using_expr, '') ILIKE '%foldername%auth.uid()%'
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'Cannot delete another teacher object'
UNION ALL
SELECT
  22,
  'No broad teacher-timetables storage policy',
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM storage_policy_exprs
      WHERE polname LIKE 'teacher_timetables_storage_%'
        AND (
          coalesce(using_expr, '') ILIKE '%true%'
          OR coalesce(with_check_expr, '') ILIKE '%true%'
        )
    ) THEN 'PASS'
    ELSE 'FAIL'
  END,
  'No permissive USING/WITH CHECK true policies';

-- ---------------------------------------------------------------------------
-- 6b. Cross-policy overlap check (teacher-timetables bucket)
-- ---------------------------------------------------------------------------

SELECT
  24 AS check_no,
  'no permissive cross-bucket policy on teacher-timetables' AS check_name,
  CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM pg_policy pol
      JOIN pg_class c ON c.oid = pol.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'storage'
        AND c.relname = 'objects'
        AND pol.polname NOT LIKE 'teacher_timetables_storage_%'
        AND (
          coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ILIKE '%teacher-timetables%'
          OR coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ILIKE '%teacher-timetables%'
        )
        AND (
          coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ILIKE '%true%'
          OR coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ILIKE '%true%'
        )
    ) THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  'Informational: no other policy grants broad access to this bucket' AS details;

-- ---------------------------------------------------------------------------
-- 7. Policy inventory (informational)
-- ---------------------------------------------------------------------------

SELECT
  pol.polname AS policy_name,
  pol.polcmd AS command,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'teacher_timetables'
ORDER BY pol.polname;

SELECT
  pol.polname AS storage_policy_name,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage'
  AND c.relname = 'objects'
  AND pol.polname LIKE 'teacher_timetables_storage_%'
ORDER BY pol.polname;
