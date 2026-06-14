-- Multi-child parent support: explicit parent_student_links table with legacy fallback.

CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_user_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent
  ON public.parent_student_links(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student
  ON public.parent_student_links(student_user_id);

GRANT SELECT ON public.parent_student_links TO authenticated;
GRANT ALL ON public.parent_student_links TO service_role;

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents read own parent_student_links" ON public.parent_student_links;
CREATE POLICY "Parents read own parent_student_links" ON public.parent_student_links
  FOR SELECT TO authenticated
  USING (parent_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage parent_student_links" ON public.parent_student_links;
CREATE POLICY "Admins manage parent_student_links" ON public.parent_student_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.parent_can_read_student(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.parent_student_links psl
      WHERE psl.parent_user_id = auth.uid()
    ) THEN EXISTS (
      SELECT 1
      FROM public.parent_student_links psl
      WHERE psl.parent_user_id = auth.uid()
        AND psl.student_user_id = target_student_id
    )
    ELSE EXISTS (
      SELECT 1
      FROM public.parent_profiles pp
      JOIN public.profiles p ON p.user_id = target_student_id
      WHERE pp.user_id = auth.uid()
        AND public.parent_matches_student_profile(pp, p)
    )
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.parent_can_read_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parent_can_read_student(uuid) TO authenticated;

DROP POLICY IF EXISTS "Parents read linked student profiles" ON public.profiles;
CREATE POLICY "Parents read linked student profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.parent_can_read_student(profiles.user_id));

DROP POLICY IF EXISTS lesson_quiz_submissions_parent_select ON public.lesson_quiz_submissions;
CREATE POLICY lesson_quiz_submissions_parent_select ON public.lesson_quiz_submissions
  FOR SELECT TO authenticated
  USING (public.parent_can_read_student(lesson_quiz_submissions.student_id));

DROP POLICY IF EXISTS quiz_certificates_parent_select ON public.quiz_certificates;
CREATE POLICY quiz_certificates_parent_select ON public.quiz_certificates
  FOR SELECT TO authenticated
  USING (public.parent_can_read_student(quiz_certificates.student_id));

-- Backfill links where a single unambiguous student match exists.
INSERT INTO public.parent_student_links (parent_user_id, student_user_id)
SELECT pp.user_id, match.student_user_id
FROM public.parent_profiles pp
CROSS JOIN LATERAL (
  SELECT p.user_id AS student_user_id
  FROM public.profiles p
  WHERE public.parent_matches_student_profile(pp, p)
) match
WHERE pp.student_name <> ''
  AND pp.student_grade <> ''
  AND (
    SELECT COUNT(*)
    FROM public.profiles p2
    WHERE public.parent_matches_student_profile(pp, p2)
  ) = 1
ON CONFLICT (parent_user_id, student_user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_parent_student_link_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_student_id uuid;
  match_count integer;
BEGIN
  IF NEW.student_name = '' OR NEW.student_grade = '' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)::integer
  INTO match_count
  FROM public.profiles p
  WHERE public.parent_matches_student_profile(NEW, p);

  IF match_count <> 1 THEN
    RETURN NEW;
  END IF;

  SELECT p.user_id
  INTO matched_student_id
  FROM public.profiles p
  WHERE public.parent_matches_student_profile(NEW, p)
  LIMIT 1;

  IF matched_student_id IS NOT NULL THEN
    INSERT INTO public.parent_student_links (parent_user_id, student_user_id)
    VALUES (NEW.user_id, matched_student_id)
    ON CONFLICT (parent_user_id, student_user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_parent_student_link ON public.parent_profiles;
CREATE TRIGGER trg_sync_parent_student_link
  AFTER INSERT OR UPDATE OF student_name, student_grade ON public.parent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_parent_student_link_from_profile();

REVOKE EXECUTE ON FUNCTION public.sync_parent_student_link_from_profile() FROM PUBLIC, anon, authenticated;
