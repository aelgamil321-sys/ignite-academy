-- MANUAL APPLY COPY — production project aijukbdxyawxzekwhrdo
-- Source: supabase/migrations/20260829150000_parent_explicit_links_security.sql
-- Parent academic access: explicit parent_student_links only.

CREATE OR REPLACE FUNCTION public.parent_can_read_student(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student_links psl
    WHERE psl.parent_user_id = auth.uid()
      AND psl.student_user_id = target_student_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.parent_can_read_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parent_can_read_student(uuid) TO authenticated;

DROP TRIGGER IF EXISTS trg_sync_parent_student_link ON public.parent_profiles;

DROP FUNCTION IF EXISTS public.sync_parent_student_link_from_profile();
