-- Fix new-assignment notifications on publish: matching students, linked parents, admins.
-- Also adds sync_assignment_notifications(assignment_id) for manual/debug backfill.

CREATE OR REPLACE FUNCTION public.normalize_grade_slug(p_grade text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE g
    WHEN '' THEN ''
    WHEN 'grade 1' THEN '1'
    WHEN 'grade-1' THEN '1'
    WHEN 'grade1' THEN '1'
    WHEN 'grade 2' THEN '2'
    WHEN 'grade-2' THEN '2'
    WHEN 'grade2' THEN '2'
    WHEN 'grade 3' THEN '3'
    WHEN 'grade-3' THEN '3'
    WHEN 'grade3' THEN '3'
    WHEN 'grade 4' THEN '4'
    WHEN 'grade-4' THEN '4'
    WHEN 'grade4' THEN '4'
    WHEN 'grade 5' THEN '5'
    WHEN 'grade-5' THEN '5'
    WHEN 'grade5' THEN '5'
    WHEN 'grade 6' THEN '6'
    WHEN 'grade-6' THEN '6'
    WHEN 'grade6' THEN '6'
    WHEN 'grade 7' THEN '7'
    WHEN 'grade-7' THEN '7'
    WHEN 'grade7' THEN '7'
    WHEN 'grade 8' THEN '8'
    WHEN 'grade-8' THEN '8'
    WHEN 'grade8' THEN '8'
    WHEN 'grade 9' THEN '9'
    WHEN 'grade-9' THEN '9'
    WHEN 'grade9' THEN '9'
    WHEN 'grade 10' THEN '10'
    WHEN 'grade-10' THEN '10'
    WHEN 'grade10' THEN '10'
    WHEN 'grade 11' THEN '11'
    WHEN 'grade-11' THEN '11'
    WHEN 'grade11' THEN '11'
    WHEN 'grade 12' THEN '12'
    WHEN 'grade-12' THEN '12'
    WHEN 'grade12' THEN '12'
    WHEN 'kg 1' THEN 'kg1'
    WHEN 'kg-1' THEN 'kg1'
    WHEN 'kg1' THEN 'kg1'
    WHEN 'kg 2' THEN 'kg2'
    WHEN 'kg-2' THEN 'kg2'
    WHEN 'kg2' THEN 'kg2'
    ELSE g
  END
  FROM (SELECT lower(trim(COALESCE(p_grade, ''))) AS g) normalized;
$$;

CREATE OR REPLACE FUNCTION public.profile_matches_assignment(
  p_grade text,
  p_section text,
  p_islamic_group text,
  p_assignment public.assignments
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(trim(p_grade), '') <> ''
    AND public.normalize_grade_slug(p_grade) = public.normalize_grade_slug(p_assignment.grade)
    AND (
      p_assignment.section IS NULL
      OR upper(trim(COALESCE(p_section, ''))) = upper(trim(p_assignment.section))
    )
    AND (
      p_assignment.islamic_group IS NULL
      OR upper(trim(COALESCE(p_islamic_group, ''))) = upper(trim(p_assignment.islamic_group))
    );
$$;

CREATE OR REPLACE FUNCTION public.notify_assignment_published_targets(p_assignment public.assignments)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_student_name text;
  v_count integer := 0;
BEGIN
  IF NOT p_assignment.published THEN
    RETURN 0;
  END IF;

  FOR v_student_id IN
    SELECT p.user_id
    FROM public.profiles p
    WHERE public.profile_matches_assignment(p.grade, p.section, p.islamic_group, p_assignment)
      AND NOT public.has_role(p.user_id, 'admin'::public.app_role)
      AND NOT public.has_role(p.user_id, 'parent'::public.app_role)
  LOOP
    PERFORM public.insert_notification(
      v_student_id,
      'assignment_created',
      'New assignment',
      'واجب جديد',
      p_assignment.title_en,
      p_assignment.title_ar,
      '/assignments/' || p_assignment.id::text,
      NULL,
      jsonb_build_object('assignment_id', p_assignment.id, 'due_date', p_assignment.due_date),
      'assignment_created:' || p_assignment.id::text || ':' || v_student_id::text
    );
    v_count := v_count + 1;

    SELECT COALESCE(
      NULLIF(trim(p.full_name), ''),
      NULLIF(trim(p.english_name), ''),
      NULLIF(trim(p.arabic_name), ''),
      'Student'
    )
    INTO v_student_name
    FROM public.profiles p
    WHERE p.user_id = v_student_id;

    PERFORM public.notify_parents_of_student(
      v_student_id,
      'child_assignment_created',
      'New assignment for your child',
      'واجب جديد لابنك/ابنتك',
      v_student_name || ' — ' || p_assignment.title_en,
      v_student_name || ' — ' || p_assignment.title_ar,
      '/parent/dashboard',
      jsonb_build_object('assignment_id', p_assignment.id, 'student_id', v_student_id),
      'child_assignment_created:' || p_assignment.id::text || ':' || v_student_id::text
    );
  END LOOP;

  PERFORM public.notify_all_admins(
    'admin_assignment_published',
    'Assignment published',
    'تم نشر واجب',
    p_assignment.title_en,
    p_assignment.title_ar,
    '/admin/assignments',
    NULL,
    jsonb_build_object('assignment_id', p_assignment.id),
    'admin_assignment_published:' || p_assignment.id::text
  );

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notify_assignment_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT NEW.published THEN
    RETURN NEW;
  END IF;

  -- Draft saves and edits to already-published assignments do not re-notify.
  IF TG_OP = 'UPDATE' AND OLD.published IS NOT DISTINCT FROM NEW.published THEN
    RETURN NEW;
  END IF;

  PERFORM public.notify_assignment_published_targets(NEW);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assignment_published ON public.assignments;
CREATE TRIGGER trg_notify_assignment_published
  AFTER INSERT OR UPDATE OF published ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_assignment_published();

CREATE OR REPLACE FUNCTION public.sync_assignment_notifications(p_assignment_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.assignments;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_row
  FROM public.assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN public.notify_assignment_published_targets(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_grade_slug(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.profile_matches_assignment(text, text, text, public.assignments) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_assignment_published_targets(public.assignments) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_assignment_notifications(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sync_assignment_notifications(uuid) TO authenticated;
