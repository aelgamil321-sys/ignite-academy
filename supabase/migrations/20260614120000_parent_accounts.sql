-- Parent accounts: separate parent_profiles table, parent role, and linked-student read access.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'parent';

CREATE TABLE IF NOT EXISTS public.parent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  student_name text NOT NULL DEFAULT '',
  student_grade text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_profiles_user_id ON public.parent_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_profiles_student_lookup
  ON public.parent_profiles(student_grade, student_name);

GRANT SELECT, INSERT, UPDATE ON public.parent_profiles TO authenticated;
GRANT ALL ON public.parent_profiles TO service_role;

ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents read own parent_profile" ON public.parent_profiles;
CREATE POLICY "Parents read own parent_profile" ON public.parent_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Parents insert own parent_profile" ON public.parent_profiles;
CREATE POLICY "Parents insert own parent_profile" ON public.parent_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Parents update own parent_profile" ON public.parent_profiles;
CREATE POLICY "Parents update own parent_profile" ON public.parent_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all parent_profiles" ON public.parent_profiles;
CREATE POLICY "Admins read all parent_profiles" ON public.parent_profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.normalize_person_name(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(regexp_replace(COALESCE(name, ''), '\s+', ' ', 'g')));
$$;

CREATE OR REPLACE FUNCTION public.parent_matches_student_profile(
  pp public.parent_profiles,
  p public.profiles
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p.grade = pp.student_grade
    AND (
      public.normalize_person_name(p.full_name) = public.normalize_person_name(pp.student_name)
      OR public.normalize_person_name(p.english_name) = public.normalize_person_name(pp.student_name)
      OR public.normalize_person_name(p.arabic_name) = public.normalize_person_name(pp.student_name)
    );
$$;

DROP POLICY IF EXISTS "Parents read linked student profiles" ON public.profiles;
CREATE POLICY "Parents read linked student profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.parent_profiles pp
      WHERE pp.user_id = auth.uid()
        AND public.parent_matches_student_profile(pp, profiles)
    )
  );

DROP POLICY IF EXISTS lesson_quiz_submissions_parent_select ON public.lesson_quiz_submissions;
CREATE POLICY lesson_quiz_submissions_parent_select ON public.lesson_quiz_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.parent_profiles pp
      JOIN public.profiles p ON p.user_id = lesson_quiz_submissions.student_id
      WHERE pp.user_id = auth.uid()
        AND public.parent_matches_student_profile(pp, p)
    )
  );

DROP POLICY IF EXISTS quiz_certificates_parent_select ON public.quiz_certificates;
CREATE POLICY quiz_certificates_parent_select ON public.quiz_certificates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.parent_profiles pp
      JOIN public.profiles p ON p.user_id = quiz_certificates.student_id
      WHERE pp.user_id = auth.uid()
        AND public.parent_matches_student_profile(pp, p)
    )
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  intent text;
  assigned_grade text;
  linked_student_name text;
BEGIN
  intent := COALESCE(NEW.raw_user_meta_data->>'role_intent', 'student');
  assigned_grade := COALESCE(NEW.raw_user_meta_data->>'grade', '');
  linked_student_name := COALESCE(NEW.raw_user_meta_data->>'student_name', '');

  IF intent = 'parent' THEN
    INSERT INTO public.parent_profiles (user_id, full_name, email, student_name, student_grade)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.email, ''),
      linked_student_name,
      assigned_grade
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      student_name = CASE WHEN EXCLUDED.student_name <> '' THEN EXCLUDED.student_name ELSE public.parent_profiles.student_name END,
      student_grade = CASE WHEN EXCLUDED.student_grade <> '' THEN EXCLUDED.student_grade ELSE public.parent_profiles.student_grade END,
      updated_at = now();
  ELSE
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
