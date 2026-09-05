-- Phase 4.2: subject-aware teacher assignments (Islamic Education + Qur'an).

-- ---------------------------------------------------------------------------
-- teacher_assignments.subject_type
-- ---------------------------------------------------------------------------

ALTER TABLE public.teacher_assignments
  ADD COLUMN IF NOT EXISTS subject_type text NOT NULL DEFAULT 'islamic_education';

ALTER TABLE public.teacher_assignments
  DROP CONSTRAINT IF EXISTS teacher_assignments_subject_type_check;

ALTER TABLE public.teacher_assignments
  ADD CONSTRAINT teacher_assignments_subject_type_check
  CHECK (subject_type IN ('islamic_education', 'quran'));

COMMENT ON COLUMN public.teacher_assignments.subject_type IS
  'Teaching subject scope: islamic_education or quran. Existing rows default to islamic_education.';

DROP INDEX IF EXISTS idx_teacher_assignments_unique_scope;

CREATE UNIQUE INDEX idx_teacher_assignments_unique_scope
  ON public.teacher_assignments (teacher_id, subject_type, grade, section, islamic_group)
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject
  ON public.teacher_assignments (teacher_id, subject_type, grade);

-- ---------------------------------------------------------------------------
-- lessons.teaching_subject (distinct from subject_category content taxonomy)
-- ---------------------------------------------------------------------------

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS teaching_subject text NOT NULL DEFAULT 'islamic_education';

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_teaching_subject_check;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_teaching_subject_check
  CHECK (teaching_subject IN ('islamic_education', 'quran'));

COMMENT ON COLUMN public.lessons.teaching_subject IS
  'Platform teaching subject (Islamic Education vs Qur''an). Legacy rows default to islamic_education.';

-- ---------------------------------------------------------------------------
-- Normalization trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_teacher_assignment_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.grade := trim(COALESCE(NEW.grade, ''));
  IF NEW.grade = '' THEN
    RAISE EXCEPTION 'grade is required';
  END IF;
  NEW.subject_type := lower(trim(COALESCE(NEW.subject_type, 'islamic_education')));
  IF NEW.subject_type NOT IN ('islamic_education', 'quran') THEN
    RAISE EXCEPTION 'invalid subject_type: %', NEW.subject_type;
  END IF;
  NEW.section := public.normalize_profile_section(NEW.section);
  NEW.islamic_group := public.normalize_profile_islamic_group(NEW.islamic_group);
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Subject-aware lesson permission helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teacher_can_manage_lesson_scope(
  p_grade text,
  p_teaching_subject text DEFAULT 'islamic_education'
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher')
    AND (
      public.teacher_is_lead_teacher()
      OR EXISTS (
        SELECT 1
        FROM public.teacher_assignments ta
        WHERE ta.teacher_id = auth.uid()
          AND trim(ta.grade) = trim(COALESCE(p_grade, ''))
          AND trim(COALESCE(p_grade, '')) <> ''
          AND ta.subject_type = COALESCE(NULLIF(trim(p_teaching_subject), ''), 'islamic_education')
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_can_manage_lesson_scope(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_manage_lesson_scope(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.teacher_can_manage_lesson_grade(p_grade text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'teacher')
    AND (
      public.teacher_is_lead_teacher()
      OR EXISTS (
        SELECT 1
        FROM public.teacher_assignments ta
        WHERE ta.teacher_id = auth.uid()
          AND trim(ta.grade) = trim(COALESCE(p_grade, ''))
          AND trim(COALESCE(p_grade, '')) <> ''
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_write_lesson_grade(p_grade text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.teacher_can_manage_lesson_grade(p_grade);
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_write_lesson_id(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.id = p_lesson_id
      AND public.teacher_can_manage_lesson_scope(
        l.grade,
        COALESCE(l.teaching_subject, 'islamic_education')
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Lessons RLS — subject-aware teacher writes
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS lessons_teacher_select ON public.lessons;
CREATE POLICY lessons_teacher_select ON public.lessons
  FOR SELECT TO authenticated
  USING (
    public.teacher_can_manage_lesson_scope(
      lessons.grade,
      COALESCE(lessons.teaching_subject, 'islamic_education')
    )
  );

DROP POLICY IF EXISTS lessons_teacher_insert ON public.lessons;
CREATE POLICY lessons_teacher_insert ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (
    public.teacher_can_manage_lesson_scope(
      lessons.grade,
      COALESCE(lessons.teaching_subject, 'islamic_education')
    )
  );

DROP POLICY IF EXISTS lessons_teacher_update ON public.lessons;
CREATE POLICY lessons_teacher_update ON public.lessons
  FOR UPDATE TO authenticated
  USING (
    public.teacher_can_manage_lesson_scope(
      lessons.grade,
      COALESCE(lessons.teaching_subject, 'islamic_education')
    )
  )
  WITH CHECK (
    public.teacher_can_manage_lesson_scope(
      lessons.grade,
      COALESCE(lessons.teaching_subject, 'islamic_education')
    )
  );

DROP POLICY IF EXISTS lessons_teacher_delete ON public.lessons;
CREATE POLICY lessons_teacher_delete ON public.lessons
  FOR DELETE TO authenticated
  USING (
    public.teacher_can_manage_lesson_scope(
      lessons.grade,
      COALESCE(lessons.teaching_subject, 'islamic_education')
    )
  );
