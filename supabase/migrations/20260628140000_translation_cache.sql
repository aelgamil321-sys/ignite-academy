-- Server-side translation cache for Ignite AI (fr/de/ur/zh lesson content).
CREATE TABLE IF NOT EXISTS public.translation_cache (
  cache_key text PRIMARY KEY,
  source_text text NOT NULL,
  source_lang text NOT NULL CHECK (source_lang IN ('en', 'ar')),
  target_lang text NOT NULL CHECK (target_lang IN ('fr', 'de', 'ur', 'zh')),
  content_type text,
  lesson_id text,
  field_name text,
  translated_text text NOT NULL,
  provider text NOT NULL DEFAULT 'machine',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS translation_cache_lesson_target_idx
  ON public.translation_cache (lesson_id, target_lang);

CREATE INDEX IF NOT EXISTS translation_cache_target_idx
  ON public.translation_cache (target_lang);

ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.translation_cache IS 'Cached machine/AI translations keyed by lang, content type, lesson, field, and source hash.';
