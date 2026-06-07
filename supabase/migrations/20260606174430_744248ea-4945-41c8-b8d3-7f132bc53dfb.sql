
-- 1. Lock down cms-uploads storage bucket to admins
DROP POLICY IF EXISTS cms_uploads_public_read ON storage.objects;
DROP POLICY IF EXISTS cms_uploads_public_insert ON storage.objects;
DROP POLICY IF EXISTS cms_uploads_public_update ON storage.objects;
DROP POLICY IF EXISTS cms_uploads_public_delete ON storage.objects;

CREATE POLICY cms_uploads_admin_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cms-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY cms_uploads_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cms-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY cms_uploads_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'cms-uploads' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'cms-uploads' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY cms_uploads_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cms-uploads' AND public.has_role(auth.uid(), 'admin'));

-- 2. Explicit admin-only write policies on user_roles (defense in depth)
CREATE POLICY "Admins insert user_roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update user_roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete user_roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Address linter: revoke EXECUTE on has_role from anon/authenticated.
-- It is only invoked from within RLS policies (which run as the policy owner),
-- so users do not need direct EXECUTE rights.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
