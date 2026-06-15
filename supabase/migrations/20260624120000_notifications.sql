-- In-app notifications for students, parents, and admins.

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  body_en text NOT NULL DEFAULT '',
  body_ar text NOT NULL DEFAULT '',
  href text,
  related_student_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id)
  WHERE read_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_dedupe
  ON public.notifications(user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

REVOKE INSERT, DELETE ON public.notifications FROM authenticated;

-- Insert a notification (deduped). Used by triggers and RPCs only.
CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id uuid,
  p_type text,
  p_title_en text,
  p_title_ar text,
  p_body_en text DEFAULT '',
  p_body_ar text DEFAULT '',
  p_href text DEFAULT NULL,
  p_related_student_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_dedupe_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title_en,
    title_ar,
    body_en,
    body_ar,
    href,
    related_student_id,
    metadata,
    dedupe_key
  )
  VALUES (
    p_user_id,
    p_type,
    p_title_en,
    p_title_ar,
    COALESCE(p_body_en, ''),
    COALESCE(p_body_ar, ''),
    p_href,
    p_related_student_id,
    COALESCE(p_metadata, '{}'::jsonb),
    p_dedupe_key
  )
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_all_admins(
  p_type text,
  p_title_en text,
  p_title_ar text,
  p_body_en text DEFAULT '',
  p_body_ar text DEFAULT '',
  p_href text DEFAULT NULL,
  p_related_student_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_dedupe_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  FOR v_admin_id IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
  LOOP
    PERFORM public.insert_notification(
      v_admin_id,
      p_type,
      p_title_en,
      p_title_ar,
      p_body_en,
      p_body_ar,
      p_href,
      p_related_student_id,
      p_metadata,
      CASE WHEN p_dedupe_key IS NOT NULL THEN p_dedupe_key || ':admin:' || v_admin_id::text ELSE NULL END
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_parents_of_student(
  p_student_id uuid,
  p_type text,
  p_title_en text,
  p_title_ar text,
  p_body_en text DEFAULT '',
  p_body_ar text DEFAULT '',
  p_href text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_dedupe_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid;
BEGIN
  FOR v_parent_id IN
    SELECT psl.parent_user_id
    FROM public.parent_student_links psl
    WHERE psl.student_user_id = p_student_id
  LOOP
    PERFORM public.insert_notification(
      v_parent_id,
      p_type,
      p_title_en,
      p_title_ar,
      p_body_en,
      p_body_ar,
      p_href,
      p_student_id,
      p_metadata,
      CASE WHEN p_dedupe_key IS NOT NULL THEN p_dedupe_key || ':parent:' || v_parent_id::text ELSE NULL END
    );
  END LOOP;
END;
$$;

-- New published assignment → matching students
CREATE OR REPLACE FUNCTION public.trg_notify_assignment_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_due text;
BEGIN
  IF NOT NEW.published THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.published IS NOT DISTINCT FROM NEW.published THEN
    RETURN NEW;
  END IF;

  v_due := to_char(NEW.due_date AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI');

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

  PERFORM public.notify_all_admins(
    'admin_assignment_published',
    'Assignment published',
    'تم نشر واجب',
    NEW.title_en,
    NEW.title_ar,
    '/admin/assignments',
    NULL,
    jsonb_build_object('assignment_id', NEW.id),
    'admin_assignment_published:' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assignment_published ON public.assignments;
CREATE TRIGGER trg_notify_assignment_published
  AFTER INSERT OR UPDATE OF published ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_assignment_published();

-- Assignment graded → student + parents
CREATE OR REPLACE FUNCTION public.trg_notify_assignment_graded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.assignments;
  v_score text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'graded' OR OLD.status = 'graded' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_assignment FROM public.assignments a WHERE a.id = NEW.assignment_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_score := COALESCE(NEW.score::text, '—') || ' / ' || COALESCE(NEW.max_points::text, v_assignment.max_points::text);

  PERFORM public.insert_notification(
    NEW.student_id,
    'assignment_graded',
    'Assignment graded',
    'تم تقييم الواجب',
    v_assignment.title_en || ' — ' || v_score,
    v_assignment.title_ar || ' — ' || v_score,
    '/assignments/' || NEW.assignment_id::text,
    NULL,
    jsonb_build_object('assignment_id', NEW.assignment_id, 'submission_id', NEW.id, 'score', NEW.score),
    'assignment_graded:' || NEW.id::text
  );

  PERFORM public.notify_parents_of_student(
    NEW.student_id,
    'child_assignment_graded',
    'Child assignment graded',
    'تم تقييم واجب ابنك/ابنتك',
    v_assignment.title_en || ' — ' || v_score,
    v_assignment.title_ar || ' — ' || v_score,
    '/parent/dashboard',
    jsonb_build_object('assignment_id', NEW.assignment_id, 'submission_id', NEW.id),
    'child_assignment_graded:' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assignment_graded ON public.assignment_submissions;
CREATE TRIGGER trg_notify_assignment_graded
  AFTER UPDATE OF status, score ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_assignment_graded();

-- Assignment submitted → parents + admins
CREATE OR REPLACE FUNCTION public.trg_notify_assignment_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.assignments;
  v_student_name text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_assignment FROM public.assignments a WHERE a.id = NEW.assignment_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(trim(p.english_name), ''), 'Student')
  INTO v_student_name
  FROM public.profiles p
  WHERE p.user_id = NEW.student_id;

  PERFORM public.notify_parents_of_student(
    NEW.student_id,
    'child_assignment_submitted',
    'Child submitted assignment',
    'أرسل ابنك/ابنتك واجبًا',
    v_student_name || ' — ' || v_assignment.title_en,
    v_student_name || ' — ' || v_assignment.title_ar,
    '/parent/dashboard',
    jsonb_build_object('assignment_id', NEW.assignment_id, 'submission_id', NEW.id),
    'child_assignment_submitted:' || NEW.id::text
  );

  PERFORM public.notify_all_admins(
    'admin_assignment_submitted',
    'New assignment submission',
    'إرسال واجب جديد',
    v_student_name || ' — ' || v_assignment.title_en,
    v_student_name || ' — ' || v_assignment.title_ar,
    '/admin/assignments',
    NEW.student_id,
    jsonb_build_object('assignment_id', NEW.assignment_id, 'submission_id', NEW.id),
    'admin_assignment_submitted:' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_assignment_submitted ON public.assignment_submissions;
CREATE TRIGGER trg_notify_assignment_submitted
  AFTER INSERT ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_assignment_submitted();

-- Certificate earned → student + parents + admins
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

  PERFORM public.notify_all_admins(
    'admin_certificate_earned',
    'Certificate issued',
    'إصدار شهادة',
    v_lesson_title_en || ' — ' || NEW.percentage::text || '%',
    v_lesson_title_ar || ' — ' || NEW.percentage::text || '%',
    '/admin',
    NEW.student_id,
    jsonb_build_object('certificate_id', NEW.certificate_id),
    'admin_certificate_earned:' || NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_certificate_earned ON public.quiz_certificates;
CREATE TRIGGER trg_notify_certificate_earned
  AFTER INSERT ON public.quiz_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_certificate_earned();

-- Due-soon assignments for the signed-in student (client calls on load)
CREATE OR REPLACE FUNCTION public.sync_assignment_due_soon_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_count integer := 0;
  v_row record;
  v_hours numeric;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  FOR v_row IN
    SELECT a.*
    FROM public.assignments a
    WHERE a.published = true
      AND a.due_date > now()
      AND a.due_date <= now() + interval '48 hours'
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = v_uid
          AND p.grade = a.grade
          AND (a.section IS NULL OR a.section = p.section)
          AND (a.islamic_group IS NULL OR a.islamic_group = p.islamic_group)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.assignment_submissions s
        WHERE s.assignment_id = a.id
          AND s.student_id = v_uid
      )
  LOOP
    v_hours := round(extract(epoch FROM (v_row.due_date - now())) / 3600.0);
    PERFORM public.insert_notification(
      v_uid,
      'assignment_due_soon',
      'Assignment due soon',
      'موعد تسليم قريب',
      v_row.title_en || ' — due in ' || greatest(v_hours, 1)::text || 'h',
      v_row.title_ar || ' — التسليم خلال ' || greatest(v_hours, 1)::text || ' ساعة',
      '/assignments/' || v_row.id::text,
      NULL,
      jsonb_build_object('assignment_id', v_row.id, 'due_date', v_row.due_date),
      'assignment_due_soon:' || v_row.id::text || ':' || v_uid::text
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Badge unlocked (client calls when progress detects new badge)
CREATE OR REPLACE FUNCTION public.notify_badge_unlocked(p_badge_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_title_en text;
  v_title_ar text;
  v_body_en text;
  v_body_ar text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  v_title_en := CASE p_badge_id
    WHEN 'first_certificate' THEN 'First Certificate'
    WHEN 'excellent_student' THEN 'Excellent Student'
    WHEN 'lesson_explorer' THEN 'Lesson Explorer'
    WHEN 'quiz_master' THEN 'Quiz Master'
    WHEN 'rising_star' THEN 'Rising Star'
    WHEN 'academy_graduate' THEN 'Academy Graduate'
    ELSE 'Badge unlocked'
  END;
  v_title_ar := CASE p_badge_id
    WHEN 'first_certificate' THEN 'أول شهادة'
    WHEN 'excellent_student' THEN 'طالب متميز'
    WHEN 'lesson_explorer' THEN 'مستكشف الدروس'
    WHEN 'quiz_master' THEN 'بطل الاختبارات'
    WHEN 'rising_star' THEN 'نجم صاعد'
    WHEN 'academy_graduate' THEN 'خريج الأكاديمية'
    ELSE 'شارة جديدة'
  END;
  v_body_en := 'You unlocked a new achievement badge.';
  v_body_ar := 'لقد فتحت شارة إنجاز جديدة.';

  PERFORM public.insert_notification(
    v_uid,
    'badge_unlocked',
    'Badge unlocked',
    'شارة جديدة',
    v_title_en || ' — ' || v_body_en,
    v_title_ar || ' — ' || v_body_ar,
    '/student',
    NULL,
    jsonb_build_object('badge_id', p_badge_id),
    'badge_unlocked:' || p_badge_id || ':' || v_uid::text
  );

  PERFORM public.notify_parents_of_student(
    v_uid,
    'child_badge_unlocked',
    'Child unlocked badge',
    'فتح ابنك/ابنتك شارة',
    v_title_en,
    v_title_ar,
    '/parent/dashboard',
    jsonb_build_object('badge_id', p_badge_id),
    'child_badge_unlocked:' || p_badge_id || ':' || v_uid::text
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read_at = now()
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND read_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.notifications
  SET read_at = now()
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_notification(uuid, text, text, text, text, text, text, uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_all_admins(text, text, text, text, text, text, uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_parents_of_student(uuid, text, text, text, text, text, text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_assignment_due_soon_notifications() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_badge_unlocked(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sync_assignment_due_soon_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_badge_unlocked(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
