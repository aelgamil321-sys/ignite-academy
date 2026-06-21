import type { Lang } from "@/lib/i18n-config";
import type { EducationalContentType } from "@/lib/translate-educational-content";
import {
  buildEducationalCacheKey,
  contentHash,
  type EducationalCacheKeyInput,
} from "@/lib/translation-cache";

export type TranslationCacheEntry = {
  cacheKey: string;
  sourceText: string;
  sourceLang: "en" | "ar";
  targetLang: Lang;
  contentType?: EducationalContentType;
  lessonId?: string;
  fieldName?: string;
  translatedText: string;
  provider: string;
};

export function buildTranslationCacheKey(input: EducationalCacheKeyInput): string {
  return buildEducationalCacheKey(input);
}

export { contentHash };

async function getSupabaseAdmin() {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  } catch {
    return null;
  }
}

/** Read cached translation from Postgres. Returns null on miss or DB unavailable. */
export async function getDbCachedTranslation(
  cacheKey: string,
): Promise<string | null> {
  const admin = await getSupabaseAdmin();
  if (!admin) return null;

  try {
    const { data, error } = await admin
      .from("translation_cache")
      .select("translated_text, source_text")
      .eq("cache_key", cacheKey)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as { translated_text: string; source_text: string };
    const translated = row.translated_text?.trim();
    const source = row.source_text?.trim();
    if (!translated || !source || translated === source) return null;
    return translated;
  } catch {
    return null;
  }
}

/** Batch-read cached translations. Missing keys are omitted from the map. */
export async function getDbCachedTranslations(
  cacheKeys: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (cacheKeys.length === 0) return result;

  const admin = await getSupabaseAdmin();
  if (!admin) return result;

  try {
    const { data, error } = await admin
      .from("translation_cache")
      .select("cache_key, translated_text, source_text")
      .in("cache_key", cacheKeys);

    if (error || !data) return result;

    for (const row of data as Array<{
      cache_key: string;
      translated_text: string;
      source_text: string;
    }>) {
      const translated = row.translated_text?.trim();
      const source = row.source_text?.trim();
      if (translated && source && translated !== source) {
        result.set(row.cache_key, translated);
      }
    }
  } catch {
    // ignore — caller falls back to live translation
  }

  return result;
}

/** Persist translation to Postgres (upsert). Silent no-op if DB unavailable. */
export async function setDbCachedTranslation(entry: TranslationCacheEntry): Promise<void> {
  const admin = await getSupabaseAdmin();
  if (!admin) return;

  const trimmed = entry.translatedText.trim();
  const source = entry.sourceText.trim();
  if (!trimmed || !source || trimmed === source) return;

  try {
    await admin.from("translation_cache").upsert(
      {
        cache_key: entry.cacheKey,
        source_text: source,
        source_lang: entry.sourceLang,
        target_lang: entry.targetLang,
        content_type: entry.contentType ?? null,
        lesson_id: entry.lessonId ?? null,
        field_name: entry.fieldName ?? null,
        translated_text: trimmed,
        provider: entry.provider,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" },
    );
  } catch {
    // cache write failure must not break translation
  }
}

export async function setDbCachedTranslations(entries: TranslationCacheEntry[]): Promise<void> {
  await Promise.all(entries.map((e) => setDbCachedTranslation(e)));
}
