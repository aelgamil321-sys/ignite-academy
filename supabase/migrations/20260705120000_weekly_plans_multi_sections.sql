-- Weekly plans: multi-section scope (sections text[] + normalized sections_key uniqueness)

ALTER TABLE public.weekly_plans
  ADD COLUMN IF NOT EXISTS sections text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sections_key text NOT NULL DEFAULT '';

-- Migrate legacy single section values into sections array
UPDATE public.weekly_plans
SET sections = ARRAY[section]
WHERE section IS NOT NULL
  AND (sections IS NULL OR sections = '{}');

ALTER TABLE public.weekly_plans
  DROP CONSTRAINT IF EXISTS weekly_plans_sections_check;

ALTER TABLE public.weekly_plans
  ADD CONSTRAINT weekly_plans_sections_check
    CHECK (sections <@ ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']::text[]);

CREATE OR REPLACE FUNCTION public.normalize_weekly_plan_sections_array(p_sections text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT array_agg(DISTINCT s ORDER BY s)
      FROM unnest(COALESCE(p_sections, '{}'::text[])) AS s
      WHERE s IN ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H')
    ),
    '{}'::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.weekly_plan_sections_key(p_sections text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT array_to_string(public.normalize_weekly_plan_sections_array(p_sections), ',');
$$;

CREATE OR REPLACE FUNCTION public.normalize_weekly_plan_sections_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sections IS NULL OR array_length(NEW.sections, 1) IS NULL THEN
    IF NEW.section IS NOT NULL THEN
      NEW.sections := ARRAY[NEW.section];
    ELSE
      NEW.sections := '{}'::text[];
    END IF;
  END IF;

  NEW.sections := public.normalize_weekly_plan_sections_array(NEW.sections);
  NEW.sections_key := public.weekly_plan_sections_key(NEW.sections);
  NEW.section := CASE
    WHEN array_length(NEW.sections, 1) > 0 THEN NEW.sections[1]
    ELSE NULL
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_weekly_plans_normalize_sections ON public.weekly_plans;
CREATE TRIGGER trg_weekly_plans_normalize_sections
  BEFORE INSERT OR UPDATE ON public.weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_weekly_plan_sections_row();

-- Backfill sections_key for existing rows
UPDATE public.weekly_plans
SET sections_key = public.weekly_plan_sections_key(sections)
WHERE sections_key IS NULL OR sections_key = '';

DROP INDEX IF EXISTS idx_weekly_plans_unique_scope;
CREATE UNIQUE INDEX idx_weekly_plans_unique_scope
  ON public.weekly_plans (teacher_id, week_number, grade, sections_key, islamic_group)
  NULLS NOT DISTINCT;

DROP INDEX IF EXISTS idx_weekly_plans_scope;
CREATE INDEX IF NOT EXISTS idx_weekly_plans_sections
  ON public.weekly_plans USING GIN (sections);

CREATE OR REPLACE FUNCTION public.teacher_weekly_plan_sections_allowed(
  p_grade text,
  p_sections text[],
  p_islamic_group text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    array_length(public.normalize_weekly_plan_sections_array(p_sections), 1) > 0
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(public.normalize_weekly_plan_sections_array(p_sections)) AS s(section_code)
      WHERE NOT public.teacher_can_read_assignment_row(p_grade, section_code, p_islamic_group)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_weekly_plan_sections_allowed(text, text[], text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_weekly_plan_sections_allowed(text, text[], text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.teacher_can_manage_weekly_plan_sections_row(
  p_teacher_id uuid,
  p_grade text,
  p_sections text[],
  p_islamic_group text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'teacher')
      AND (
        public.teacher_is_lead_teacher()
        OR (
          p_teacher_id = auth.uid()
          AND public.teacher_weekly_plan_sections_allowed(p_grade, p_sections, p_islamic_group)
        )
      )
    );
$$;

REVOKE EXECUTE ON FUNCTION public.teacher_can_manage_weekly_plan_sections_row(uuid, text, text[], text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_can_manage_weekly_plan_sections_row(uuid, text, text[], text)
  TO authenticated;

DROP POLICY IF EXISTS weekly_plans_teacher_insert ON public.weekly_plans;
CREATE POLICY weekly_plans_teacher_insert ON public.weekly_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    weekly_plans.teacher_id = auth.uid()
    AND public.has_role(auth.uid(), 'teacher')
    AND public.teacher_weekly_plan_sections_allowed(
      weekly_plans.grade,
      weekly_plans.sections,
      weekly_plans.islamic_group
    )
  );

DROP POLICY IF EXISTS weekly_plans_teacher_update ON public.weekly_plans;
CREATE POLICY weekly_plans_teacher_update ON public.weekly_plans
  FOR UPDATE TO authenticated
  USING (
    public.teacher_can_manage_weekly_plan_sections_row(
      weekly_plans.teacher_id,
      weekly_plans.grade,
      weekly_plans.sections,
      weekly_plans.islamic_group
    )
  )
  WITH CHECK (
    public.teacher_can_manage_weekly_plan_sections_row(
      weekly_plans.teacher_id,
      weekly_plans.grade,
      weekly_plans.sections,
      weekly_plans.islamic_group
    )
    AND (
      weekly_plans.teacher_id = auth.uid()
      OR public.teacher_is_lead_teacher()
    )
  );

DROP POLICY IF EXISTS weekly_plans_teacher_delete ON public.weekly_plans;
CREATE POLICY weekly_plans_teacher_delete ON public.weekly_plans
  FOR DELETE TO authenticated
  USING (
    public.teacher_can_manage_weekly_plan_sections_row(
      weekly_plans.teacher_id,
      weekly_plans.grade,
      weekly_plans.sections,
      weekly_plans.islamic_group
    )
  );

COMMENT ON COLUMN public.weekly_plans.sections IS
  'Class sections covered by this weekly plan (multi-select). Sorted unique codes A–H.';
COMMENT ON COLUMN public.weekly_plans.sections_key IS
  'Normalized comma-separated section codes for uniqueness (e.g. A,B,C).';
