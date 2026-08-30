-- Extend teacher timetable uploads for AI import MVP (local only — not applied to production).
-- Adds Office formats and raises max upload size to 25 MB.

ALTER TABLE public.teacher_timetables
  DROP CONSTRAINT IF EXISTS teacher_timetables_mime_type_chk;

ALTER TABLE public.teacher_timetables
  ADD CONSTRAINT teacher_timetables_mime_type_chk
  CHECK (
    mime_type IN (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )
  );

ALTER TABLE public.teacher_timetables
  DROP CONSTRAINT IF EXISTS teacher_timetables_file_size_chk;

ALTER TABLE public.teacher_timetables
  ADD CONSTRAINT teacher_timetables_file_size_chk
  CHECK (file_size > 0 AND file_size <= 26214400);

UPDATE storage.buckets
SET
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
WHERE id = 'teacher-timetables';
