-- READ-ONLY production verification for parent explicit-links security.
-- Run in Supabase SQL Editor (project aijukbdxyawxzekwhrdo).

-- 1) parent_can_read_student definition
SELECT pg_get_functiondef(p.oid) AS parent_can_read_student_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'parent_can_read_student'
  AND pg_get_function_identity_arguments(p.oid) = 'target_student_id uuid';

-- 2) Legacy sync function must be absent
SELECT COUNT(*)::int AS sync_function_count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'sync_parent_student_link_from_profile';

-- 3) Legacy sync trigger must be absent
SELECT COUNT(*)::int AS sync_trigger_count
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'parent_profiles'
  AND NOT t.tgisinternal
  AND t.tgname = 'trg_sync_parent_student_link';

-- 4) Link-code RPCs preserved
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('redeem_parent_link_code', 'get_my_parent_link_code')
ORDER BY p.proname;

-- 5) Explicit links preserved (count only)
SELECT COUNT(*)::int AS parent_student_links_count
FROM public.parent_student_links;

-- 6) Policies still reference parent_can_read_student
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual LIKE '%parent_can_read_student%'
    OR with_check LIKE '%parent_can_read_student%'
  )
ORDER BY tablename, policyname;
