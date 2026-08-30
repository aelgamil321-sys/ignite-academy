-- Teacher display identity: backfill profiles from auth metadata and secure name RPCs.
-- teacher_requests is onboarding-only; approved teachers persist identity in public.profiles.

-- ---------------------------------------------------------------------------
-- 1. Shared display-name resolver (staff / teacher / admin creators)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_staff_display_name(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(trim(p.full_name), ''),
    NULLIF(trim(p.english_name), ''),
    NULLIF(trim(p.arabic_name), ''),
    NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''),
    NULLIF(split_part(COALESCE(p.email, au.email, ''), '@', 1), ''),
    '—'
  )
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  WHERE au.id = p_user_id;
$$;

COMMENT ON FUNCTION public.resolve_staff_display_name(uuid) IS
  'Internal helper: display name from profiles, then auth metadata full_name, then email local-part.';

REVOKE ALL ON FUNCTION public.resolve_staff_display_name(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_staff_display_name(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_staff_display_name(uuid) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 2. Backfill teacher profiles from auth.users (one-time data repair)
-- ---------------------------------------------------------------------------

INSERT INTO public.profiles (user_id, full_name, email)
SELECT
  u.id,
  COALESCE(
    NULLIF(trim(u.raw_user_meta_data->>'full_name'), ''),
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
    ''
  ),
  COALESCE(u.email, '')
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'teacher'
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.profiles p
SET
  full_name = COALESCE(
    NULLIF(trim(p.full_name), ''),
    NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''),
    NULLIF(split_part(COALESCE(p.email, au.email, ''), '@', 1), ''),
    p.full_name
  ),
  email = COALESCE(NULLIF(trim(p.email), ''), NULLIF(trim(au.email), ''), p.email),
  updated_at = now()
FROM auth.users au
JOIN public.user_roles ur ON ur.user_id = au.id AND ur.role = 'teacher'
WHERE p.user_id = au.id
  AND (
    trim(p.full_name) = ''
    OR trim(p.email) = ''
  );

-- ---------------------------------------------------------------------------
-- 3. Teacher display names RPC (admin + teacher roles)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_teacher_display_names(p_user_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.has_role(v_uid, 'admin')
    OR public.has_role(v_uid, 'teacher')
  ) THEN
    RAISE EXCEPTION 'admin or teacher only' USING ERRCODE = '42501';
  END IF;

  IF p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(
      uid.user_id::text,
      public.resolve_staff_display_name(uid.user_id)
    ),
    '{}'::jsonb
  )
  INTO v_result
  FROM unnest(p_user_ids) AS uid(user_id)
  WHERE EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = uid.user_id
      AND ur.role IN ('teacher', 'admin')
  );

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.get_teacher_display_names(uuid[]) IS
  'Authorized admin/teacher display names for teacher/admin user IDs. No email or auth metadata exposure.';

REVOKE ALL ON FUNCTION public.get_teacher_display_names(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_teacher_display_names(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_teacher_display_names(uuid[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Announcement creator names — add auth-metadata fallback for teachers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_announcement_creator_display_names(p_user_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  IF p_user_ids IS NULL OR cardinality(p_user_ids) = 0 THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(
      uid.user_id::text,
      public.resolve_staff_display_name(uid.user_id)
    ),
    '{}'::jsonb
  )
  INTO v_result
  FROM unnest(p_user_ids) AS uid(user_id);

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Signup: persist teacher identity in profiles (not only teacher_requests)
-- ---------------------------------------------------------------------------

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

    INSERT INTO public.profiles (user_id, full_name, email, preferred_language)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.email, ''),
      assigned_lang
    )
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = CASE
        WHEN trim(EXCLUDED.full_name) <> '' THEN EXCLUDED.full_name
        ELSE public.profiles.full_name
      END,
      email = CASE
        WHEN trim(EXCLUDED.email) <> '' THEN EXCLUDED.email
        ELSE public.profiles.email
      END,
      preferred_language = EXCLUDED.preferred_language,
      updated_at = now();
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

-- ---------------------------------------------------------------------------
-- 6. Sync teacher identity into profiles (admin approval / self repair)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_teacher_profile_identity(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_full_name text;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT (public.has_role(v_uid, 'admin') OR v_uid = p_user_id) THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT
    COALESCE(
      NULLIF(trim(tr.full_name), ''),
      NULLIF(trim(au.raw_user_meta_data->>'full_name'), ''),
      ''
    ),
    COALESCE(NULLIF(trim(tr.email), ''), NULLIF(trim(au.email), ''), '')
  INTO v_full_name, v_email
  FROM auth.users au
  LEFT JOIN public.teacher_requests tr ON tr.user_id = au.id
  WHERE au.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (p_user_id, COALESCE(v_full_name, ''), COALESCE(v_email, ''))
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = CASE
      WHEN trim(EXCLUDED.full_name) <> '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END,
    email = CASE
      WHEN trim(EXCLUDED.email) <> '' THEN EXCLUDED.email
      ELSE public.profiles.email
    END,
    updated_at = now();
END;
$$;

COMMENT ON FUNCTION public.sync_teacher_profile_identity(uuid) IS
  'Persist teacher display identity in public.profiles from teacher_requests/auth metadata. Admin or self only.';

REVOKE ALL ON FUNCTION public.sync_teacher_profile_identity(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_teacher_profile_identity(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_teacher_profile_identity(uuid) TO authenticated;
