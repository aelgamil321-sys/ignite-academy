-- Notifications: parent missing assignments, admin registration alerts, trim extra admin alerts.

-- Stop notifying admins on every assignment publish (not in admin spec).
CREATE OR REPLACE FUNCTION public.trg_notify_assignment_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  IF NOT NEW.published THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.published IS NOT DISTINCT FROM NEW.published THEN
    RETURN NEW;
  END IF;

  FOR v_student_id IN
    SELECT p.user_id
    FROM public.profiles p
    WHERE p.grade = NEW.grade
      AND (NEW.section IS NULL OR NEW.section = p.section)
      AND (NEW.islamic_group IS NULL OR NEW.islamic_group = p.islamic_group)
  LOOP
    PERFORM public.insert_notification(
      v_student_id,
      'assignment_created',
      'New assignment',
      'واجب جديد',
      NEW.title_en,
      NEW.title_ar,
      '/assignments/' || NEW.id::text,
      NULL,
      jsonb_build_object('assignment_id', NEW.id, 'due_date', NEW.due_date),
      'assignment_created:' || NEW.id::text || ':' || v_student_id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Stop notifying admins on every certificate (not in admin spec).
CREATE OR REPLACE FUNCTION public.trg_notify_certificate_earned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lesson_title_en text := 'Lesson';
  v_lesson_title_ar text := 'درس';
BEGIN
  SELECT COALESCE(l.title->>'en', 'Lesson'), COALESCE(l.title->>'ar', 'درس')
  INTO v_lesson_title_en, v_lesson_title_ar
  FROM public.lessons l
  WHERE l.id = NEW.lesson_id;

  PERFORM public.insert_notification(
    NEW.student_id,
    'certificate_earned',
    'Certificate earned',
    'شهادة جديدة',
    v_lesson_title_en || ' — ' || NEW.percentage::text || '%',
    v_lesson_title_ar || ' — ' || NEW.percentage::text || '%',
    '/student',
    NULL,
    jsonb_build_object('certificate_id', NEW.certificate_id, 'lesson_id', NEW.lesson_id),
    'certificate_earned:' || NEW.id::text
  );

  PERFORM public.notify_parents_of_student(
    NEW.student_id,
    'child_certificate_earned',
    'Child earned certificate',
    'حصل ابنك/ابنتك على شهادة',
    v_lesson_title_en || ' — ' || NEW.percentage::text || '%',
    v_lesson_title_ar || ' — ' || NEW.percentage::text || '%',
    '/parent/dashboard',
    jsonb_build_object('certificate_id', NEW.certificate_id, 'lesson_id', NEW.lesson_id),
    'child_certificate_earned:' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

-- Parent: missing assignments for linked children (client sync on load).
CREATE OR REPLACE FUNCTION public.sync_parent_missing_assignment_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
  v_count integer := 0;
  v_child record;
  v_assignment record;
  v_child_name text;
BEGIN
  v_parent_id := auth.uid();
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  FOR v_child IN
    SELECT psl.student_user_id AS student_id, p.grade, p.section, p.islamic_group,
           COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(p.english_name), ''), 'Student') AS child_name
    FROM public.parent_student_links psl
    JOIN public.profiles p ON p.user_id = psl.student_user_id
    WHERE psl.parent_user_id = v_parent_id
  LOOP
    v_child_name := v_child.child_name;

    FOR v_assignment IN
      SELECT a.*
      FROM public.assignments a
      WHERE a.published = true
        AND a.due_date < now()
        AND a.grade = v_child.grade
        AND (a.section IS NULL OR a.section = v_child.section)
        AND (a.islamic_group IS NULL OR a.islamic_group = v_child.islamic_group)
        AND NOT EXISTS (
          SELECT 1
          FROM public.assignment_submissions s
          WHERE s.assignment_id = a.id
            AND s.student_id = v_child.student_id
        )
    LOOP
      PERFORM public.insert_notification(
        v_parent_id,
        'child_assignment_missing',
        'Missing assignment',
        'واجب ناقص',
        v_child_name || ' — ' || v_assignment.title_en,
        v_child_name || ' — ' || v_assignment.title_ar,
        '/parent/dashboard',
        v_child.student_id,
        jsonb_build_object('assignment_id', v_assignment.id, 'student_id', v_child.student_id),
        'child_assignment_missing:' || v_assignment.id::text || ':' || v_child.student_id::text || ':' || v_parent_id::text
      );
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Admin: new student or parent registration.
CREATE OR REPLACE FUNCTION public.trg_notify_user_role_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := 'User';
  v_email text := '';
  v_detail text;
BEGIN
  IF NEW.role = 'student' THEN
    SELECT
      COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(p.english_name), ''), 'Student'),
      COALESCE(p.email, '')
    INTO v_name, v_email
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id;

    v_detail := v_name || CASE WHEN v_email <> '' THEN ' — ' || v_email ELSE '' END;

    PERFORM public.notify_all_admins(
      'admin_student_registered',
      'New student registered',
      'تسجيل طالب جديد',
      v_detail,
      v_detail,
      '/admin',
      NEW.user_id,
      jsonb_build_object('user_id', NEW.user_id, 'role', 'student'),
      'admin_student_registered:' || NEW.user_id::text
    );
  ELSIF NEW.role = 'parent' THEN
    SELECT
      COALESCE(NULLIF(trim(pp.full_name), ''), 'Parent'),
      COALESCE(pp.email, '')
    INTO v_name, v_email
    FROM public.parent_profiles pp
    WHERE pp.user_id = NEW.user_id;

    v_detail := v_name || CASE WHEN v_email <> '' THEN ' — ' || v_email ELSE '' END;

    PERFORM public.notify_all_admins(
      'admin_parent_registered',
      'New parent registered',
      'تسجيل ولي أمر جديد',
      v_detail,
      v_detail,
      '/admin',
      NEW.user_id,
      jsonb_build_object('user_id', NEW.user_id, 'role', 'parent'),
      'admin_parent_registered:' || NEW.user_id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_user_role_assigned ON public.user_roles;
CREATE TRIGGER trg_notify_user_role_assigned
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_user_role_assigned();

REVOKE ALL ON FUNCTION public.sync_parent_missing_assignment_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_parent_missing_assignment_notifications() TO authenticated;
