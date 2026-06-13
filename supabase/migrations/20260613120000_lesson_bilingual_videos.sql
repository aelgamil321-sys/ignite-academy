-- Bilingual YouTube links per lesson (keep youtube_url for legacy reads)
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS youtube_url_ar TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS youtube_url_en TEXT NOT NULL DEFAULT '';

UPDATE public.lessons
SET youtube_url_en = youtube_url
WHERE youtube_url <> '' AND youtube_url_en = '';
