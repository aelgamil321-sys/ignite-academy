-- Teacher signup requests (pending admin approval before teacher role is granted).

CREATE TABLE IF NOT EXISTS public.teacher_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_requests_status_created
  ON public.teacher_requests (status, created_at DESC);

COMMENT ON TABLE public.teacher_requests IS
  'Pending teacher signup requests; approved by admin before teacher role is granted.';

GRANT SELECT, INSERT ON public.teacher_requests TO authenticated;
GRANT UPDATE, DELETE ON public.teacher_requests TO authenticated;
GRANT ALL ON public.teacher_requests TO service_role;

ALTER TABLE public.teacher_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_requests_select_own ON public.teacher_requests;
CREATE POLICY teacher_requests_select_own ON public.teacher_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS teacher_requests_insert_own ON public.teacher_requests;
CREATE POLICY teacher_requests_insert_own ON public.teacher_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS teacher_requests_admin_all ON public.teacher_requests;
CREATE POLICY teacher_requests_admin_all ON public.teacher_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Signup: teacher intent creates a pending request only (no student/parent role).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  intent text;
  assigned_grade text;
  assigned_section text;
  assigned_islamic_group text;
  assigned_lang text;
  assigned_phone text;
BEGIN
  intent := COALESCE(NEW.raw_user_meta_data->>'role_intent', 'student');
  assigned_grade := COALESCE(NEW.raw_user_meta_data->>'grade', '');
  assigned_section := public.normalize_profile_section(NEW.raw_user_meta_data->>'section');
  assigned_islamic_group := public.normalize_profile_islamic_group(NEW.raw_user_meta_data->>'islamic_group');
  assigned_lang := public.normalize_preferred_language(NEW.raw_user_meta_data->>'preferred_language');
  assigned_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');

  IF intent = 'teacher' THEN
    INSERT INTO public.teacher_requests (user_id, full_name, email, phone, status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.email, ''),
      assigned_phone,
      'pending'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      phone = COALESCE(EXCLUDED.phone, public.teacher_requests.phone),
      status = CASE
        WHEN public.teacher_requests.status = 'rejected' THEN 'pending'
        ELSE public.teacher_requests.status
      END,
      reviewed_at = NULL,
      reviewed_by = NULL;
  ELSIF intent = 'parent' THEN
    INSERT INTO public.parent_profiles (user_id, full_name, email, student_name, student_grade, preferred_language)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.email, ''),
      '',
      '',
      assigned_lang
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      preferred_language = EXCLUDED.preferred_language,
      updated_at = now();
  ELSE
    INSERT INTO public.profiles (
      user_id,
      full_name,
      email,
      grade,
      arabic_name,
      english_name,
      section,
      islamic_group,
      preferred_language
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.email, ''),
      assigned_grade,
      COALESCE(NEW.raw_user_meta_data->>'arabic_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'english_name', ''),
      assigned_section,
      assigned_islamic_group,
      assigned_lang
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      grade = CASE WHEN EXCLUDED.grade <> '' THEN EXCLUDED.grade ELSE public.profiles.grade END,
      arabic_name = CASE WHEN EXCLUDED.arabic_name <> '' THEN EXCLUDED.arabic_name ELSE public.profiles.arabic_name END,
      english_name = CASE WHEN EXCLUDED.english_name <> '' THEN EXCLUDED.english_name ELSE public.profiles.english_name END,
      section = COALESCE(EXCLUDED.section, public.profiles.section),
      islamic_group = COALESCE(EXCLUDED.islamic_group, public.profiles.islamic_group),
      preferred_language = EXCLUDED.preferred_language,
      updated_at = now();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSIF intent = 'admin' THEN
    NULL;
  ELSIF intent = 'parent' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'parent')
    ON CONFLICT DO NOTHING;
  ELSIF intent = 'teacher' THEN
    NULL;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
