-- Teacher personal timetable uploads (raw file + future parsed_schedule for AI).
-- NOT applied — pending security review approval.

CREATE TABLE IF NOT EXISTS public.teacher_timetables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  parsed_schedule jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_timetables_storage_path_owner_chk
    CHECK (storage_path LIKE teacher_id::text || '/%'),
  CONSTRAINT teacher_timetables_mime_type_chk
    CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT teacher_timetables_file_size_chk
    CHECK (file_size > 0 AND file_size <= 10485760)
);

COMMENT ON TABLE public.teacher_timetables IS
  'One current timetable file per teacher. parsed_schedule reserved for future server-side AI extraction.';
COMMENT ON COLUMN public.teacher_timetables.parsed_schedule IS
  'Future AI-parsed weekly schedule JSON. Writable only via service_role/backend, not teacher clients.';

ALTER TABLE public.teacher_timetables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_timetables_select ON public.teacher_timetables;
CREATE POLICY teacher_timetables_select ON public.teacher_timetables
  FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS teacher_timetables_insert ON public.teacher_timetables;
CREATE POLICY teacher_timetables_insert ON public.teacher_timetables
  FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND parsed_schedule IS NULL
  );

DROP POLICY IF EXISTS teacher_timetables_update ON public.teacher_timetables;
CREATE POLICY teacher_timetables_update ON public.teacher_timetables
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (
    teacher_id = auth.uid()
    AND storage_path LIKE auth.uid()::text || '/%'
  );

DROP POLICY IF EXISTS teacher_timetables_delete ON public.teacher_timetables;
CREATE POLICY teacher_timetables_delete ON public.teacher_timetables
  FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_timetables TO authenticated;
GRANT ALL ON public.teacher_timetables TO service_role;

CREATE OR REPLACE FUNCTION public.teacher_timetables_guard_parsed_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.parsed_schedule := NULL;
  ELSIF TG_OP = 'UPDATE' AND NEW.parsed_schedule IS DISTINCT FROM OLD.parsed_schedule THEN
    NEW.parsed_schedule := OLD.parsed_schedule;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teacher_timetables_guard_parsed_schedule ON public.teacher_timetables;
CREATE TRIGGER teacher_timetables_guard_parsed_schedule
  BEFORE INSERT OR UPDATE ON public.teacher_timetables
  FOR EACH ROW
  EXECUTE FUNCTION public.teacher_timetables_guard_parsed_schedule();

CREATE OR REPLACE FUNCTION public.teacher_timetables_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teacher_timetables_set_updated_at ON public.teacher_timetables;
CREATE TRIGGER teacher_timetables_set_updated_at
  BEFORE UPDATE ON public.teacher_timetables
  FOR EACH ROW
  EXECUTE FUNCTION public.teacher_timetables_set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'teacher-timetables',
  'teacher-timetables',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS teacher_timetables_storage_select ON storage.objects;
CREATE POLICY teacher_timetables_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'teacher-timetables'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS teacher_timetables_storage_insert ON storage.objects;
CREATE POLICY teacher_timetables_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'teacher-timetables'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS teacher_timetables_storage_update ON storage.objects;
CREATE POLICY teacher_timetables_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'teacher-timetables'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'teacher-timetables'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS teacher_timetables_storage_delete ON storage.objects;
CREATE POLICY teacher_timetables_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'teacher-timetables'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
