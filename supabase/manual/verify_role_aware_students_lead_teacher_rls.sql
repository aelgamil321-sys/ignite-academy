-- READ-ONLY verification for 20260830150000_role_aware_students_lead_teacher_rls.sql
-- Run in Supabase SQL Editor AFTER manual apply. No writes.

-- ---------------------------------------------------------------------------
-- A. is_admin_or_lead_teacher exists and is SECURITY DEFINER
-- ---------------------------------------------------------------------------
SELECT proname, prosecdef, provolatile
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'is_admin_or_lead_teacher';

-- ---------------------------------------------------------------------------
-- B. Ahmed remains role=teacher (not admin)
-- ---------------------------------------------------------------------------
SELECT ur.role, u.email
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email = 'a.elawadi@igniteschool.ae'
ORDER BY ur.role;

-- ---------------------------------------------------------------------------
-- C. Ahmed is_lead_teacher=true
-- ---------------------------------------------------------------------------
SELECT tp.is_lead_teacher, u.email
FROM public.teacher_profiles tp
JOIN auth.users u ON u.id = tp.user_id
WHERE u.email = 'a.elawadi@igniteschool.ae';

-- ---------------------------------------------------------------------------
-- D. Normal teachers is_lead_teacher=false (sample: igniteschool.ae teachers)
-- ---------------------------------------------------------------------------
SELECT u.email, tp.is_lead_teacher
FROM public.teacher_profiles tp
JOIN auth.users u ON u.id = tp.user_id
JOIN public.user_roles ur ON ur.user_id = tp.user_id AND ur.role = 'teacher'
WHERE u.email LIKE '%@igniteschool.ae'
ORDER BY tp.is_lead_teacher DESC, u.email;

-- ---------------------------------------------------------------------------
-- E. Mr Ayman admin remains admin
-- ---------------------------------------------------------------------------
SELECT ur.role, u.email
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email IN (
  'mr.ayman.0509965749@gmail.com',
  'ayman.abdalla@igniteschool.ae'
)
ORDER BY u.email, ur.role;

-- ---------------------------------------------------------------------------
-- F. teacher_assignments preserved (count snapshot)
-- ---------------------------------------------------------------------------
SELECT COUNT(*)::int AS teacher_assignments_count
FROM public.teacher_assignments;

-- ---------------------------------------------------------------------------
-- G. @igniteschool.ae teachers are NOT classified as students
-- ---------------------------------------------------------------------------
SELECT u.email, ur.role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email LIKE '%@igniteschool.ae'
  AND ur.role = 'student'
ORDER BY u.email;

-- ---------------------------------------------------------------------------
-- H. Student-role population counts
-- ---------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'student') AS student_roles,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'user') AS legacy_user_roles,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'teacher') AS teacher_roles,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'parent') AS parent_roles,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin') AS admin_roles,
  (
    SELECT COUNT(*)
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'student'
  ) AS role_aware_student_profiles;

-- ---------------------------------------------------------------------------
-- I. Lead Teacher RLS policies exist
-- ---------------------------------------------------------------------------
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname ILIKE '%lead_teacher%'
ORDER BY tablename, policyname;

-- ---------------------------------------------------------------------------
-- J. Normal teacher / admin baseline policies still present (not replaced)
-- ---------------------------------------------------------------------------
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'user_roles',
    'teacher_profiles',
    'teacher_assignments',
    'parent_student_links',
    'parent_profiles',
    'lesson_quiz_submissions',
    'quiz_certificates'
  )
  AND policyname NOT ILIKE '%lead_teacher%'
ORDER BY tablename, policyname;

-- ---------------------------------------------------------------------------
-- K. get_admin_hall_of_fame filters role=student
-- ---------------------------------------------------------------------------
SELECT pg_get_functiondef('public.get_admin_hall_of_fame()'::regprocedure) ILIKE '%role = ''student''%' AS hof_has_student_role_filter;

-- ---------------------------------------------------------------------------
-- L. Legacy profiles=student assumption removed from admin HoF RPC
-- ---------------------------------------------------------------------------
SELECT pg_get_functiondef('public.get_admin_hall_of_fame()'::regprocedure) ILIKE '%NOT IN (SELECT user_id FROM admin_users)%' AS hof_still_uses_admin_exclusion_only;

-- ---------------------------------------------------------------------------
-- M. get_announcement_creator_display_names available + lead/admin auth
-- ---------------------------------------------------------------------------
SELECT proname, prosecdef
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname = 'get_announcement_creator_display_names';

SELECT pg_get_functiondef('public.get_announcement_creator_display_names(uuid[])'::regprocedure) ILIKE '%is_admin_or_lead_teacher%' AS creator_names_allows_lead_teacher;

-- ---------------------------------------------------------------------------
-- Optional: legacy role='user' orphan audit (should be 0 in healthy production)
-- ---------------------------------------------------------------------------
SELECT u.id, u.email, ur.role, ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'user'
ORDER BY ur.created_at;
