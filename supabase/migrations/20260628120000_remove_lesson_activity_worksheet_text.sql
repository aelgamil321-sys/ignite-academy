-- Student activity and worksheet text are no longer used; worksheets are file downloads only.
ALTER TABLE public.lessons
  DROP COLUMN IF EXISTS activity,
  DROP COLUMN IF EXISTS worksheet_text;
