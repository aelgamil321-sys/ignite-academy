-- Soft delete for lessons: mark as deleted instead of removing rows.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
