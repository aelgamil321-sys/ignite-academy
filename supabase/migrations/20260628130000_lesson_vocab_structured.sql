-- Vocabulary is stored as structured JSON: { "items": [{ "word": { "en", "ar" }, "meaning": { "en", "ar" } }] }
-- Legacy lessons keep { "en": "...", "ar": "..." } until edited; the app parses both formats at read time.

COMMENT ON COLUMN public.lessons.vocab IS 'Structured vocabulary items ({ items: [...] }) or legacy bilingual comma/dash-separated text ({ en, ar })';
