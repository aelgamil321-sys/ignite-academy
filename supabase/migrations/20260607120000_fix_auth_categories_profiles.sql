-- Fix duplicate auth triggers, role assignment, profiles.grade, and subject categories.

-- 1. Remove legacy bootstrap trigger (wrong name was dropped in prior migration)
DROP TRIGGER IF EXISTS on_auth_user_created_bootstrap_admin ON auth.users;
DROP TRIGGER IF EXISTS bootstrap_first_admin_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.bootstrap_first_admin();

-- 2. Extend profiles with grade assignment
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grade text NOT NULL DEFAULT '';

-- 3. Islamic subject category on content tables
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS subject_category text NOT NULL DEFAULT 'quran',
  ADD COLUMN IF NOT EXISTS worksheet_text jsonb NOT NULL DEFAULT '{"en":"","ar":""}'::jsonb;

ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS subject_category text NOT NULL DEFAULT 'quran';

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS subject_category text NOT NULL DEFAULT '';

-- 4. Normalize legacy grade slug values
UPDATE public.lessons SET grade = '8' WHERE grade IN ('grade-8', 'Grade 8', 'grade 8');
UPDATE public.lessons SET grade = '1' WHERE grade IN ('grade-1', 'Grade 1');
UPDATE public.lessons SET grade = '2' WHERE grade IN ('grade-2', 'Grade 2');
UPDATE public.lessons SET grade = '3' WHERE grade IN ('grade-3', 'Grade 3');
UPDATE public.lessons SET grade = '4' WHERE grade IN ('grade-4', 'Grade 4');
UPDATE public.lessons SET grade = '5' WHERE grade IN ('grade-5', 'Grade 5');
UPDATE public.lessons SET grade = '6' WHERE grade IN ('grade-6', 'Grade 6');
UPDATE public.lessons SET grade = '7' WHERE grade IN ('grade-7', 'Grade 7');
UPDATE public.lessons SET grade = '9' WHERE grade IN ('grade-9', 'Grade 9', 'Grade 9');
UPDATE public.lessons SET grade = '10' WHERE grade IN ('grade-10', 'Grade 10');
UPDATE public.lessons SET grade = '11' WHERE grade IN ('grade-11', 'Grade 11');
UPDATE public.lessons SET grade = '12' WHERE grade IN ('grade-12', 'Grade 12');
UPDATE public.lessons SET grade = 'kg1' WHERE grade ILIKE 'kg1%' OR grade ILIKE '%روضة 1%';
UPDATE public.lessons SET grade = 'kg2' WHERE grade ILIKE 'kg2%' OR grade ILIKE '%روضة 2%';

UPDATE public.videos SET grade = '8' WHERE grade IN ('grade-8', 'Grade 8', 'grade 8');
UPDATE public.videos SET grade = '1' WHERE grade IN ('grade-1', 'Grade 1');
UPDATE public.videos SET grade = '2' WHERE grade IN ('grade-2', 'Grade 2');
UPDATE public.videos SET grade = '3' WHERE grade IN ('grade-3', 'Grade 3');
UPDATE public.videos SET grade = '4' WHERE grade IN ('grade-4', 'Grade 4');
UPDATE public.videos SET grade = '5' WHERE grade IN ('grade-5', 'Grade 5');
UPDATE public.videos SET grade = '6' WHERE grade IN ('grade-6', 'Grade 6');
UPDATE public.videos SET grade = '7' WHERE grade IN ('grade-7', 'Grade 7');
UPDATE public.videos SET grade = '9' WHERE grade IN ('grade-9', 'Grade 9');
UPDATE public.videos SET grade = '10' WHERE grade IN ('grade-10', 'Grade 10');
UPDATE public.videos SET grade = '11' WHERE grade IN ('grade-11', 'Grade 11');
UPDATE public.videos SET grade = '12' WHERE grade IN ('grade-12', 'Grade 12');
UPDATE public.videos SET grade = 'kg1' WHERE grade ILIKE 'kg1%';
UPDATE public.videos SET grade = 'kg2' WHERE grade ILIKE 'kg2%';

UPDATE public.files SET grade = '8' WHERE grade IN ('grade-8', 'Grade 8', 'grade 8');
UPDATE public.files SET grade = '1' WHERE grade IN ('grade-1', 'Grade 1');
UPDATE public.files SET grade = '2' WHERE grade IN ('grade-2', 'Grade 2');
UPDATE public.files SET grade = '3' WHERE grade IN ('grade-3', 'Grade 3');
UPDATE public.files SET grade = '4' WHERE grade IN ('grade-4', 'Grade 4');
UPDATE public.files SET grade = '5' WHERE grade IN ('grade-5', 'Grade 5');
UPDATE public.files SET grade = '6' WHERE grade IN ('grade-6', 'Grade 6');
UPDATE public.files SET grade = '7' WHERE grade IN ('grade-7', 'Grade 7');
UPDATE public.files SET grade = '9' WHERE grade IN ('grade-9', 'Grade 9');
UPDATE public.files SET grade = '10' WHERE grade IN ('grade-10', 'Grade 10');
UPDATE public.files SET grade = '11' WHERE grade IN ('grade-11', 'Grade 11');
UPDATE public.files SET grade = '12' WHERE grade IN ('grade-12', 'Grade 12');
UPDATE public.files SET grade = 'kg1' WHERE grade ILIKE 'kg1%';
UPDATE public.files SET grade = 'kg2' WHERE grade ILIKE 'kg2%';

-- 5. Role assignment respects role_intent; first user is always admin
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

  INSERT INTO public.profiles (user_id, full_name, email, grade)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    assigned_grade
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    grade = CASE WHEN EXCLUDED.grade <> '' THEN EXCLUDED.grade ELSE public.profiles.grade END,
    updated_at = now();

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSIF intent = 'admin' THEN
    -- Admin signups still need promotion by an existing admin (no self-grant)
    NULL;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 6. Admins can read all roles (for user management UI)
DROP POLICY IF EXISTS "Admins read all user_roles" ON public.user_roles;
CREATE POLICY "Admins read all user_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
