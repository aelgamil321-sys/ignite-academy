-- Fix parent link codes: enable pgcrypto when available, safe fallback otherwise, backfill.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.parent_link_random_suffix()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public, extensions
AS $$
DECLARE
  raw text;
  cleaned text := '';
  i integer;
  ch text;
BEGIN
  BEGIN
    BEGIN
      raw := upper(encode(extensions.gen_random_bytes(5), 'hex'));
    EXCEPTION WHEN OTHERS THEN
      raw := upper(encode(gen_random_bytes(5), 'hex'));
    END;
  EXCEPTION WHEN OTHERS THEN
    raw := upper(
      replace(
        md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text),
        '-',
        '',
      ),
    );
  END;

  FOR i IN 1..length(raw) LOOP
    ch := substr(raw, i, 1);
    IF ch ~ '[A-Z0-9]' THEN
      cleaned := cleaned || ch;
    END IF;
    EXIT WHEN length(cleaned) >= 6;
  END LOOP;

  RETURN substr(rpad(cleaned, 6, 'X'), 1, 6);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_parent_link_code(p_grade text DEFAULT '')
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  suffix text;
  candidate text;
  attempts integer := 0;
BEGIN
  LOOP
    suffix := public.parent_link_random_suffix();
    candidate := 'IIA-' || suffix;

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE public.normalize_parent_link_code(p.parent_link_code) = public.normalize_parent_link_code(candidate)
    );

    attempts := attempts + 1;
    IF attempts > 40 THEN
      RAISE EXCEPTION 'Could not generate unique parent link code';
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;

-- Ensure column and helpers exist (idempotent if prior migration partially applied).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_link_code text;

CREATE OR REPLACE FUNCTION public.normalize_parent_link_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT upper(regexp_replace(COALESCE(p_code, ''), '[^A-Z0-9]', '', 'g'));
$$;

DROP INDEX IF EXISTS idx_profiles_parent_link_code_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_parent_link_code_unique
  ON public.profiles (public.normalize_parent_link_code(parent_link_code))
  WHERE parent_link_code IS NOT NULL AND trim(parent_link_code) <> '';

CREATE OR REPLACE FUNCTION public.ensure_profile_parent_link_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_link_code IS NULL OR trim(NEW.parent_link_code) = '' THEN
    NEW.parent_link_code := public.generate_parent_link_code(NEW.grade);
  ELSE
    NEW.parent_link_code := upper(trim(NEW.parent_link_code));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_profile_parent_link_code ON public.profiles;
CREATE TRIGGER trg_ensure_profile_parent_link_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_profile_parent_link_code();

UPDATE public.profiles
SET parent_link_code = public.generate_parent_link_code(grade),
    updated_at = now()
WHERE parent_link_code IS NULL OR trim(parent_link_code) = '';

CREATE OR REPLACE FUNCTION public.get_my_parent_link_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  code text;
  student_grade text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT parent_link_code, grade
  INTO code, student_grade
  FROM public.profiles
  WHERE user_id = uid;

  IF student_grade IS NULL THEN
    RETURN NULL;
  END IF;

  IF code IS NULL OR trim(code) = '' THEN
    code := public.generate_parent_link_code(student_grade);
    UPDATE public.profiles
    SET parent_link_code = code,
        updated_at = now()
    WHERE user_id = uid;
  END IF;

  RETURN code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_parent_link_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_parent_link_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.parent_link_random_suffix() FROM PUBLIC, anon, authenticated;
