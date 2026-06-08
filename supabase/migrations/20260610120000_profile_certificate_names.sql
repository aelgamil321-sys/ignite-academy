-- Student display names for certificates (bilingual).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS arabic_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS english_name text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  intent text;
  assigned_grade text;
BEGIN
  intent := COALESCE(NEW.raw_user_meta_data->>'role_intent', 'student');
  assigned_grade := COALESCE(NEW.raw_user_meta_data->>'grade', '');

  INSERT INTO public.profiles (user_id, full_name, email, grade, arabic_name, english_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    assigned_grade,
    COALESCE(NEW.raw_user_meta_data->>'arabic_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'english_name', '')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    grade = CASE WHEN EXCLUDED.grade <> '' THEN EXCLUDED.grade ELSE public.profiles.grade END,
    arabic_name = CASE WHEN EXCLUDED.arabic_name <> '' THEN EXCLUDED.arabic_name ELSE public.profiles.arabic_name END,
    english_name = CASE WHEN EXCLUDED.english_name <> '' THEN EXCLUDED.english_name ELSE public.profiles.english_name END,
    updated_at = now();

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSIF intent = 'admin' THEN
    NULL;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
