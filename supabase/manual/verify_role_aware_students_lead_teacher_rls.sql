-- Read-only verification for 20260830150000_role_aware_students_lead_teacher_rls.sql
-- Run AFTER manual apply in production.

-- 1. Helper exists
SELECT proname, prosecdef
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('is_admin_or_lead_teacher', 'get_admin_hall_of_fame', 'get_announcement_creator_display_names');

-- 2. Lead teacher SELECT policies on directories
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname ILIKE '%lead_teacher%'
ORDER BY tablename, policyname;

-- 3. Student role counts (teachers must NOT be counted as students)
SELECT
  (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'student') AS student_roles,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'teacher') AS teacher_roles,
  (
    SELECT COUNT(*)
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'student'
  ) AS role_aware_student_profiles;

-- 4. Ahmed lead teacher flag (verification only — not used in authorization code)
SELECT tp.user_id, tp.is_lead_teacher, u.email
FROM public.teacher_profiles tp
JOIN auth.users u ON u.id = tp.user_id
WHERE u.email = 'a.elawadi@igniteschool.ae';
