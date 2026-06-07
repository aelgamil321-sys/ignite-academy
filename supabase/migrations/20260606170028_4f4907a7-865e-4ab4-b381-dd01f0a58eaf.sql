
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Replace permissive policies on content tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['lessons','videos','files','articles','unit_information','unit_quizzes']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public can read %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public can insert %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public can update %1$s" ON public.%1$s', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public can delete %1$s" ON public.%1$s', t);

    -- Anyone can read published rows
    EXECUTE format($p$CREATE POLICY "Anyone reads published %1$s" ON public.%1$s
      FOR SELECT TO anon, authenticated USING (published = true)$p$, t);

    -- Admins read everything
    EXECUTE format($p$CREATE POLICY "Admins read all %1$s" ON public.%1$s
      FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'))$p$, t);

    -- Admins write
    EXECUTE format($p$CREATE POLICY "Admins insert %1$s" ON public.%1$s
      FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'))$p$, t);
    EXECUTE format($p$CREATE POLICY "Admins update %1$s" ON public.%1$s
      FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'))$p$, t);
    EXECUTE format($p$CREATE POLICY "Admins delete %1$s" ON public.%1$s
      FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'))$p$, t);

    EXECUTE format('GRANT SELECT ON public.%1$s TO anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%1$s TO authenticated', t);
  END LOOP;
END $$;
