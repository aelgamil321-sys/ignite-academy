-- Student academic grouping on existing public.profiles (nullable for legacy accounts).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS islamic_group text,
  ADD COLUMN IF NOT EXISTS section text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_islamic_group_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_islamic_group_check
  CHECK (islamic_group IS NULL OR islamic_group IN ('A', 'B'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_section_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_section_check
  CHECK (section IS NULL OR section IN ('A', 'B', 'C', 'D', 'E', 'F'));

COMMENT ON COLUMN public.profiles.islamic_group IS 'Islamic studies group (A or B) for analytics and class grouping.';
COMMENT ON COLUMN public.profiles.section IS 'Class section (A–F) for analytics and class grouping.';

CREATE INDEX IF NOT EXISTS idx_profiles_academic_grade
  ON public.profiles (grade);

CREATE INDEX IF NOT EXISTS idx_profiles_academic_section
  ON public.profiles (section)
  WHERE section IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_academic_islamic_group
  ON public.profiles (islamic_group)
  WHERE islamic_group IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_academic_analytics
  ON public.profiles (grade, section, islamic_group);

CREATE OR REPLACE FUNCTION public.normalize_profile_islamic_group(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN upper(trim(COALESCE(p_value, ''))) IN ('A', 'B')
      THEN upper(trim(p_value))
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_profile_section(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN upper(trim(COALESCE(p_value, ''))) IN ('A', 'B', 'C', 'D', 'E', 'F')
      THEN upper(trim(p_value))
    ELSE NULL
  END;
$$;

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
BEGIN
  intent := COALESCE(NEW.raw_user_meta_data->>'role_intent', 'student');
  assigned_grade := COALESCE(NEW.raw_user_meta_data->>'grade', '');
  assigned_section := public.normalize_profile_section(NEW.raw_user_meta_data->>'section');
  assigned_islamic_group := public.normalize_profile_islamic_group(NEW.raw_user_meta_data->>'islamic_group');

  IF intent = 'parent' THEN
    INSERT INTO public.parent_profiles (user_id, full_name, email, student_name, student_grade)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.email, ''),
      '',
      ''
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
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
      islamic_group
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.email, ''),
      assigned_grade,
      COALESCE(NEW.raw_user_meta_data->>'arabic_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'english_name', ''),
      assigned_section,
      assigned_islamic_group
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      grade = CASE WHEN EXCLUDED.grade <> '' THEN EXCLUDED.grade ELSE public.profiles.grade END,
      arabic_name = CASE WHEN EXCLUDED.arabic_name <> '' THEN EXCLUDED.arabic_name ELSE public.profiles.arabic_name END,
      english_name = CASE WHEN EXCLUDED.english_name <> '' THEN EXCLUDED.english_name ELSE public.profiles.english_name END,
      section = COALESCE(EXCLUDED.section, public.profiles.section),
      islamic_group = COALESCE(EXCLUDED.islamic_group, public.profiles.islamic_group),
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
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
