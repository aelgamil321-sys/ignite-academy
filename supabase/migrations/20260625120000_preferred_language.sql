-- Preferred UI language for students and parents.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'ar';

ALTER TABLE public.parent_profiles
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'ar';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_preferred_language_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_language_check
  CHECK (preferred_language IN ('ar', 'en', 'fr', 'de', 'ur', 'zh'));

ALTER TABLE public.parent_profiles
  DROP CONSTRAINT IF EXISTS parent_profiles_preferred_language_check;

ALTER TABLE public.parent_profiles
  ADD CONSTRAINT parent_profiles_preferred_language_check
  CHECK (preferred_language IN ('ar', 'en', 'fr', 'de', 'ur', 'zh'));

COMMENT ON COLUMN public.profiles.preferred_language IS 'Student UI language preference (ar, en, fr, de, ur, zh).';
COMMENT ON COLUMN public.parent_profiles.preferred_language IS 'Parent UI language preference (ar, en, fr, de, ur, zh).';

CREATE OR REPLACE FUNCTION public.normalize_preferred_language(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN raw IN ('ar', 'en', 'fr', 'de', 'ur', 'zh') THEN raw
    ELSE 'ar'
  END;
$$;

-- Extend signup trigger to persist preferred_language from auth metadata.
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
BEGIN
  intent := COALESCE(NEW.raw_user_meta_data->>'role_intent', 'student');
  assigned_grade := COALESCE(NEW.raw_user_meta_data->>'grade', '');
  assigned_section := public.normalize_profile_section(NEW.raw_user_meta_data->>'section');
  assigned_islamic_group := public.normalize_profile_islamic_group(NEW.raw_user_meta_data->>'islamic_group');
  assigned_lang := public.normalize_preferred_language(NEW.raw_user_meta_data->>'preferred_language');

  IF intent = 'parent' THEN
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
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
