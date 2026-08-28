/*
 * READ ONLY — Admin Content Ownership Summary Verification
 *
 * Project: aijukbdxyawxzekwhrdo
 * Migration: 20260828190000_admin_content_ownership_rls.sql
 *
 * Returns ONE compact result table:
 *   check_no | check_name | status | details
 *
 * Run manually in Supabase SQL Editor.
 * SELECT / WITH / catalog inspection ONLY. No data or schema changes.
 */

WITH
content_tables AS (
  SELECT unnest(
    ARRAY[
      'lessons',
      'assignments',
      'articles',
      'files',
      'videos',
      'unit_quizzes'
    ]::text[]
  ) AS table_name
),

ownership_trigger_tables AS (
  SELECT unnest(
    ARRAY[
      'lessons',
      'assignments',
      'files',
      'videos',
      'unit_quizzes'
    ]::text[]
  ) AS table_name
),

expected_teacher_policies AS (
  SELECT *
  FROM (
    VALUES
      ('lessons', 'lessons_teacher_select'),
      ('lessons', 'lessons_teacher_insert'),
      ('lessons', 'lessons_teacher_update'),
      ('lessons', 'lessons_teacher_delete'),
      ('assignments', 'assignments_teacher_select'),
      ('assignments', 'assignments_teacher_insert'),
      ('assignments', 'assignments_teacher_update'),
      ('assignments', 'assignments_teacher_delete'),
      ('articles', 'articles_teacher_select'),
      ('articles', 'articles_teacher_insert'),
      ('articles', 'articles_teacher_update'),
      ('articles', 'articles_teacher_delete'),
      ('files', 'files_teacher_select'),
      ('files', 'files_teacher_insert'),
      ('files', 'files_teacher_update'),
      ('files', 'files_teacher_delete'),
      ('videos', 'videos_teacher_select'),
      ('videos', 'videos_teacher_insert'),
      ('videos', 'videos_teacher_update'),
      ('videos', 'videos_teacher_delete'),
      ('unit_quizzes', 'unit_quizzes_teacher_select'),
      ('unit_quizzes', 'unit_quizzes_teacher_insert'),
      ('unit_quizzes', 'unit_quizzes_teacher_update'),
      ('unit_quizzes', 'unit_quizzes_teacher_delete')
  ) AS expected(tablename, policyname)
),

created_by_columns AS (
  SELECT c.table_name
  FROM information_schema.columns c
  JOIN content_tables ct ON ct.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND c.column_name = 'created_by'
),

missing_created_by AS (
  SELECT ct.table_name
  FROM content_tables ct
  LEFT JOIN created_by_columns cc ON cc.table_name = ct.table_name
  WHERE cc.table_name IS NULL
),

active_stamp_triggers AS (
  SELECT DISTINCT c.relname AS table_name
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  JOIN ownership_trigger_tables ott ON ott.table_name = c.relname
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND t.tgenabled IN ('O', 'A')
    AND p.proname = 'stamp_content_created_by'
),

missing_stamp_triggers AS (
  SELECT ott.table_name
  FROM ownership_trigger_tables ott
  LEFT JOIN active_stamp_triggers ast ON ast.table_name = ott.table_name
  WHERE ast.table_name IS NULL
),

articles_metadata_triggers AS (
  SELECT t.tgname
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND c.relname = 'articles'
    AND p.proname = 'articles_protect_metadata'
    AND t.tgenabled IN ('O', 'A')
),

admin_select_coverage AS (
  SELECT DISTINCT p.tablename
  FROM pg_policies p
  JOIN content_tables ct ON ct.table_name = p.tablename
  WHERE p.schemaname = 'public'
    AND p.cmd IN ('SELECT', 'ALL')
    AND (
      p.policyname ILIKE '%admin%'
      OR p.policyname ILIKE 'Admins%'
    )
    AND coalesce(p.qual, '') ILIKE '%has_role%'
    AND coalesce(p.qual, '') ILIKE '%admin%'
    AND coalesce(p.qual, '') NOT ILIKE '%created_by%'
),

missing_admin_select AS (
  SELECT ct.table_name
  FROM content_tables ct
  LEFT JOIN admin_select_coverage ascov ON ascov.tablename = ct.table_name
  WHERE ascov.tablename IS NULL
),

bad_admin_update AS (
  SELECT p.tablename, p.policyname, p.cmd
  FROM pg_policies p
  JOIN content_tables ct ON ct.table_name = p.tablename
  WHERE p.schemaname = 'public'
    AND p.cmd IN ('UPDATE', 'ALL')
    AND (
      p.policyname ILIKE '%admin%'
      OR p.policyname ILIKE 'Admins%'
    )
    AND (
      p.qual IS NULL
      OR coalesce(p.qual, '') NOT ILIKE '%created_by%'
      OR coalesce(p.qual, '') NOT ILIKE '%auth.uid()%'
      OR coalesce(p.qual, '') NOT ILIKE '%is not null%'
      OR (
        p.cmd = 'UPDATE'
        AND p.with_check IS NOT NULL
        AND (
          coalesce(p.with_check, '') NOT ILIKE '%created_by%'
          OR coalesce(p.with_check, '') NOT ILIKE '%auth.uid()%'
        )
      )
    )
),

bad_admin_delete AS (
  SELECT p.tablename, p.policyname, p.cmd
  FROM pg_policies p
  JOIN content_tables ct ON ct.table_name = p.tablename
  WHERE p.schemaname = 'public'
    AND p.cmd IN ('DELETE', 'ALL')
    AND (
      p.policyname ILIKE '%admin%'
      OR p.policyname ILIKE 'Admins%'
    )
    AND (
      p.qual IS NULL
      OR coalesce(p.qual, '') NOT ILIKE '%created_by%'
      OR coalesce(p.qual, '') NOT ILIKE '%auth.uid()%'
      OR coalesce(p.qual, '') NOT ILIKE '%is not null%'
    )
),

named_bypass_policies AS (
  SELECT p.tablename, p.policyname, p.cmd
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.policyname IN (
      'lessons_admin_delete',
      'unit_quizzes_admin_delete',
      'assignments_admin_all'
    )
),

other_broad_admin_writes AS (
  SELECT p.tablename, p.policyname, p.cmd
  FROM pg_policies p
  JOIN content_tables ct ON ct.table_name = p.tablename
  WHERE p.schemaname = 'public'
    AND p.cmd IN ('UPDATE', 'DELETE', 'ALL')
    AND (
      p.policyname ILIKE '%admin%'
      OR p.policyname ILIKE 'Admins%'
    )
    AND (
      p.qual IS NULL
      OR (
        coalesce(p.qual, '') NOT ILIKE '%created_by%'
        AND coalesce(p.qual, '') NOT ILIKE '%auth.uid()%'
      )
    )
),

missing_teacher_policies AS (
  SELECT e.tablename, e.policyname
  FROM expected_teacher_policies e
  LEFT JOIN pg_policies p
    ON p.schemaname = 'public'
   AND p.tablename = e.tablename
   AND p.policyname = e.policyname
  WHERE p.policyname IS NULL
),

legacy_counts AS (
  SELECT
    'lessons'::text AS table_name,
    count(*)::bigint AS total_rows,
    count(*) FILTER (WHERE created_by IS NULL)::bigint AS created_by_null,
    count(*) FILTER (WHERE created_by IS NOT NULL)::bigint AS created_by_non_null
  FROM public.lessons

  UNION ALL

  SELECT
    'assignments',
    count(*)::bigint,
    count(*) FILTER (WHERE created_by IS NULL)::bigint,
    count(*) FILTER (WHERE created_by IS NOT NULL)::bigint
  FROM public.assignments

  UNION ALL

  SELECT
    'articles',
    count(*)::bigint,
    count(*) FILTER (WHERE created_by IS NULL)::bigint,
    count(*) FILTER (WHERE created_by IS NOT NULL)::bigint
  FROM public.articles

  UNION ALL

  SELECT
    'files',
    count(*)::bigint,
    count(*) FILTER (WHERE created_by IS NULL)::bigint,
    count(*) FILTER (WHERE created_by IS NOT NULL)::bigint
  FROM public.files

  UNION ALL

  SELECT
    'videos',
    count(*)::bigint,
    count(*) FILTER (WHERE created_by IS NULL)::bigint,
    count(*) FILTER (WHERE created_by IS NOT NULL)::bigint
  FROM public.videos

  UNION ALL

  SELECT
    'unit_quizzes',
    count(*)::bigint,
    count(*) FILTER (WHERE created_by IS NULL)::bigint,
    count(*) FILTER (WHERE created_by IS NOT NULL)::bigint
  FROM public.unit_quizzes
),

legacy_count_details AS (
  SELECT string_agg(
    table_name
      || ': total='
      || total_rows::text
      || '/null='
      || created_by_null::text
      || '/non-null='
      || created_by_non_null::text,
    '; '
    ORDER BY table_name
  ) AS details
  FROM legacy_counts
),

legacy_count_invalid AS (
  SELECT table_name
  FROM legacy_counts
  WHERE created_by_null + created_by_non_null <> total_rows
),

storage_helper_functions AS (
  SELECT count(*)::int AS fn_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'lesson_id_from_lesson_files_path'
    AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_name text'
),

required_storage_admin_policies AS (
  SELECT unnest(
    ARRAY[
      'lesson_files_admin_insert',
      'lesson_files_admin_update',
      'lesson_files_admin_delete'
    ]::text[]
  ) AS policyname
),

storage_admin_policies AS (
  SELECT
    p.policyname,
    p.cmd,
    coalesce(p.qual, '') AS qual_text,
    coalesce(p.with_check, '') AS with_check_text
  FROM pg_policies p
  JOIN required_storage_admin_policies rsp ON rsp.policyname = p.policyname
  WHERE p.schemaname = 'storage'
    AND p.tablename = 'objects'
),

missing_storage_admin_policies AS (
  SELECT rsp.policyname
  FROM required_storage_admin_policies rsp
  LEFT JOIN storage_admin_policies sap ON sap.policyname = rsp.policyname
  WHERE sap.policyname IS NULL
),

bad_storage_admin_policies AS (
  SELECT sap.policyname
  FROM storage_admin_policies sap
  WHERE NOT (
    (sap.qual_text || ' ' || sap.with_check_text) ILIKE '%lesson-files%'
    AND (sap.qual_text || ' ' || sap.with_check_text) ILIKE '%lesson_id_from_lesson_files_path%'
    AND (sap.qual_text || ' ' || sap.with_check_text) ILIKE '%created_by%'
    AND (sap.qual_text || ' ' || sap.with_check_text) ILIKE '%is not null%'
    AND (sap.qual_text || ' ' || sap.with_check_text) ILIKE '%auth.uid()%'
  )
),

storage_helper_definitions AS (
  SELECT coalesce(
    string_agg(pg_catalog.pg_get_functiondef(p.oid), E'\n\n'),
    ''
  ) AS function_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'lesson_id_from_lesson_files_path'
),

checks AS (
  SELECT
    1 AS check_no,
    'created_by columns'::text AS check_name,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM missing_created_by)
      THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM missing_created_by)
      THEN 'created_by present on all 6 tables'
      ELSE 'missing: '
        || coalesce(
          (SELECT string_agg(table_name, ', ' ORDER BY table_name) FROM missing_created_by),
          'unknown'
        )
    END AS details

  UNION ALL

  SELECT
    2,
    'ownership triggers',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM missing_stamp_triggers)
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM missing_stamp_triggers)
      THEN 'stamp_content_created_by enabled on lessons, assignments, files, videos, unit_quizzes'
      ELSE 'missing/disabled on: '
        || coalesce(
          (SELECT string_agg(table_name, ', ' ORDER BY table_name) FROM missing_stamp_triggers),
          'unknown'
        )
    END

  UNION ALL

  SELECT
    3,
    'articles trigger',
    CASE
      WHEN EXISTS (SELECT 1 FROM articles_metadata_triggers)
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN EXISTS (SELECT 1 FROM articles_metadata_triggers)
      THEN 'articles_protect_metadata enabled on public.articles'
      ELSE 'articles_protect_metadata missing or disabled on public.articles'
    END

  UNION ALL

  SELECT
    4,
    'Admin broad SELECT',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM missing_admin_select)
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM missing_admin_select)
      THEN 'admin SELECT coverage on all 6 tables'
      ELSE 'missing admin SELECT on: '
        || coalesce(
          (SELECT string_agg(table_name, ', ' ORDER BY table_name) FROM missing_admin_select),
          'unknown'
        )
    END

  UNION ALL

  SELECT
    5,
    'Admin UPDATE own-only',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM bad_admin_update)
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM bad_admin_update)
      THEN 'all admin UPDATE policies require created_by = auth.uid() and block NULL-owned rows'
      ELSE coalesce(
        (
          SELECT string_agg(
            tablename || '.' || policyname || ' [' || cmd || ']',
            '; '
            ORDER BY tablename, policyname
          )
          FROM bad_admin_update
        ),
        'ambiguous/unrestricted admin UPDATE policy detected'
      )
    END

  UNION ALL

  SELECT
    6,
    'Admin DELETE own-only',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM bad_admin_delete)
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM bad_admin_delete)
      THEN 'all admin DELETE policies require created_by = auth.uid() and block NULL-owned rows'
      ELSE coalesce(
        (
          SELECT string_agg(
            tablename || '.' || policyname || ' [' || cmd || ']',
            '; '
            ORDER BY tablename, policyname
          )
          FROM bad_admin_delete
        ),
        'ambiguous/unrestricted admin DELETE policy detected'
      )
    END

  UNION ALL

  SELECT
    7,
    'Broad admin write bypass',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM named_bypass_policies)
       AND NOT EXISTS (SELECT 1 FROM other_broad_admin_writes)
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN EXISTS (SELECT 1 FROM named_bypass_policies)
      THEN 'obsolete policies still present: '
        || coalesce(
          (
            SELECT string_agg(
              tablename || '.' || policyname,
              '; '
              ORDER BY tablename, policyname
            )
            FROM named_bypass_policies
          ),
          'unknown'
        )
      WHEN EXISTS (SELECT 1 FROM other_broad_admin_writes)
      THEN 'other broad admin write policies: '
        || coalesce(
          (
            SELECT string_agg(
              tablename || '.' || policyname || ' [' || cmd || ']',
              '; '
              ORDER BY tablename, policyname
            )
            FROM other_broad_admin_writes
          ),
          'unknown'
        )
      ELSE 'no lessons_admin_delete, unit_quizzes_admin_delete, assignments_admin_all, or other broad admin writes'
    END

  UNION ALL

  SELECT
    8,
    'Teacher policies preserved',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM missing_teacher_policies)
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM missing_teacher_policies)
      THEN 'all 24 expected teacher policies present'
      ELSE 'missing: '
        || coalesce(
          (
            SELECT string_agg(
              tablename || '.' || policyname,
              '; '
              ORDER BY tablename, policyname
            )
            FROM missing_teacher_policies
          ),
          'unknown'
        )
    END

  UNION ALL

  SELECT
    9,
    'Legacy NULL ownership',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM legacy_count_invalid)
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    coalesce(
      (SELECT details FROM legacy_count_details),
      'no row counts available'
    )

  UNION ALL

  SELECT
    10,
    'Storage helper',
    CASE
      WHEN (SELECT fn_count FROM storage_helper_functions) = 1
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN (SELECT fn_count FROM storage_helper_functions) = 1
      THEN 'public.lesson_id_from_lesson_files_path(text) exists'
      ELSE 'public.lesson_id_from_lesson_files_path(text) missing'
    END

  UNION ALL

  SELECT
    11,
    'Storage admin ownership',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM missing_storage_admin_policies)
       AND NOT EXISTS (SELECT 1 FROM bad_storage_admin_policies)
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN EXISTS (SELECT 1 FROM missing_storage_admin_policies)
      THEN 'missing storage policies: '
        || coalesce(
          (
            SELECT string_agg(policyname, ', ' ORDER BY policyname)
            FROM missing_storage_admin_policies
          ),
          'unknown'
        )
      WHEN EXISTS (SELECT 1 FROM bad_storage_admin_policies)
      THEN 'storage policies missing ownership linkage: '
        || coalesce(
          (
            SELECT string_agg(policyname, ', ' ORDER BY policyname)
            FROM bad_storage_admin_policies
          ),
          'unknown'
        )
      ELSE 'lesson_files admin insert/update/delete require owned lesson via lesson_id_from_lesson_files_path'
    END

  UNION ALL

  SELECT
    12,
    'Storage fail-closed',
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM missing_storage_admin_policies)
       AND NOT EXISTS (SELECT 1 FROM bad_storage_admin_policies)
       AND (SELECT fn_count FROM storage_helper_functions) = 1
       AND (
         SELECT function_definition
         FROM storage_helper_definitions
       ) ILIKE '%return null%'
       AND EXISTS (
         SELECT 1
         FROM storage_admin_policies sap
         WHERE sap.qual_text ILIKE '%exists%'
            OR sap.with_check_text ILIKE '%exists%'
       )
      THEN 'PASS'
      ELSE 'FAIL'
    END,
    CASE
      WHEN (SELECT fn_count FROM storage_helper_functions) <> 1
      THEN 'storage helper missing'
      WHEN EXISTS (SELECT 1 FROM missing_storage_admin_policies)
      THEN 'admin storage policies incomplete'
      WHEN EXISTS (SELECT 1 FROM bad_storage_admin_policies)
      THEN 'admin storage policies do not enforce created_by IS NOT NULL ownership gate'
      WHEN (
        SELECT function_definition
        FROM storage_helper_definitions
      ) NOT ILIKE '%return null%'
      THEN 'helper does not appear to return NULL for unmappable paths'
      WHEN NOT EXISTS (
        SELECT 1
        FROM storage_admin_policies sap
        WHERE sap.qual_text ILIKE '%exists%'
           OR sap.with_check_text ILIKE '%exists%'
      )
      THEN 'admin storage policies do not use EXISTS ownership subquery'
      ELSE 'unmappable paths and NULL-owned lessons cannot satisfy admin storage write policies'
    END
)

SELECT
  c.check_no,
  c.check_name,
  c.status,
  c.details
FROM checks c

UNION ALL

SELECT
  13 AS check_no,
  'Overall security verdict'::text AS check_name,
  CASE
    WHEN bool_and(c.status = 'PASS') THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  CASE
    WHEN bool_and(c.status = 'PASS')
    THEN 'checks 1-12 all PASS'
    ELSE 'failed checks: '
      || coalesce(
        string_agg(
          c.check_no::text || '=' || c.check_name,
          '; '
          ORDER BY c.check_no
        ) FILTER (WHERE c.status = 'FAIL'),
        'unknown'
      )
  END AS details
FROM checks c

ORDER BY check_no;
