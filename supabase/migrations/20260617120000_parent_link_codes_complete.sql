-- Complete Parent Link Code flow: column, generation, student RPC, backfill.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_link_code text;

DROP INDEX IF EXISTS idx_profiles_parent_link_code_unique;

CREATE OR REPLACE FUNCTION public.normalize_parent_link_code(p_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT upper(regexp_replace(COALESCE(p_code, ''), '[^A-Z0-9]', '', 'g'));
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_parent_link_code_unique
  ON public.profiles (public.normalize_parent_link_code(parent_link_code))
  WHERE parent_link_code IS NOT NULL AND trim(parent_link_code) <> '';

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
  raw text;
  i integer;
  ch text;
  cleaned text := '';
BEGIN
  LOOP
    raw := upper(encode(gen_random_bytes(5), 'hex'));
    cleaned := '';
    FOR i IN 1..length(raw) LOOP
      ch := substr(raw, i, 1);
      IF ch ~ '[A-Z0-9]' THEN
        cleaned := cleaned || ch;
      END IF;
      EXIT WHEN length(cleaned) >= 6;
    END LOOP;
    suffix := substr(rpad(cleaned, 6, 'X'), 1, 6);
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

CREATE OR REPLACE FUNCTION public.redeem_parent_link_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_code text;
  student_uid uuid;
  parent_uid uuid;
  already_linked boolean;
BEGIN
  parent_uid := auth.uid();
  IF parent_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF NOT public.has_role(parent_uid, 'parent') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_parent');
  END IF;

  normalized_code := public.normalize_parent_link_code(p_code);
  IF normalized_code = '' OR length(normalized_code) < 7 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT p.user_id
  INTO student_uid
  FROM public.profiles p
  WHERE public.normalize_parent_link_code(p.parent_link_code) = normalized_code
  LIMIT 1;

  IF student_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  IF student_uid = parent_uid THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.parent_student_links psl
    WHERE psl.parent_user_id = parent_uid
      AND psl.student_user_id = student_uid
  )
  INTO already_linked;

  INSERT INTO public.parent_student_links (parent_user_id, student_user_id)
  VALUES (parent_uid, student_uid)
  ON CONFLICT (parent_user_id, student_user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'student_user_id', student_uid,
    'already_linked', already_linked
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_parent_link_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_parent_link_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_regenerate_parent_link_code(p_student_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  student_grade text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_admin');
  END IF;

  SELECT grade
  INTO student_grade
  FROM public.profiles
  WHERE user_id = p_student_user_id;

  IF student_grade IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'student_not_found');
  END IF;

  new_code := public.generate_parent_link_code(student_grade);

  UPDATE public.profiles
  SET parent_link_code = new_code,
      updated_at = now()
  WHERE user_id = p_student_user_id;

  RETURN jsonb_build_object('ok', true, 'parent_link_code', new_code);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_regenerate_parent_link_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_regenerate_parent_link_code(uuid) TO authenticated;
