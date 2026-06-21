import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  ignitePregenerateLessonTranslations,
  igniteSuggestVocabMeanings,
  igniteTranslateText,
  isIgniteAiConfigured,
} from "@/lib/ai/ignite-ai.server";
import {
  buildTranslationCacheKey,
  getDbCachedTranslations,
  setDbCachedTranslations,
  type TranslationCacheEntry,
} from "@/lib/ai/translation-cache.server";
import type { EducationalContentType } from "@/lib/translate-educational-content";
import {
  mergeProtectedSegments,
  splitIslamicProtectedText,
  translatableSegments,
} from "@/lib/islamic-text-protection";

const translatableLang = z.enum(["ar", "fr", "de", "ur", "zh"]);

const translateBatchSchema = z.object({
  texts: z.array(z.string().max(8000)),
  targetLang: translatableLang,
  sourceLang: z.enum(["en", "ar"]).optional(),
  contentType: z.string().optional(),
  lessonId: z.string().optional(),
  fieldNames: z.array(z.string()).optional(),
});

const vocabSuggestSchema = z.object({
  wordAr: z.string().max(500),
  wordEn: z.string().max(500),
});

const lessonFieldSchema = z.object({
  fieldName: z.string(),
  contentType: z.string(),
  text: z.string().max(8000),
  sourceLang: z.enum(["en", "ar"]).optional(),
});

const pregenerateSchema = z.object({
  lessonId: z.string(),
  fields: z.array(lessonFieldSchema).max(200),
});

function sourceLangForText(text: string, preferred?: "en" | "ar"): "en" | "ar" {
  if (preferred) return preferred;
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
}

/** Cached batch translation used by lesson pages and Ignite AI. */
export async function handleIgniteTranslateBatch(
  data: z.infer<typeof translateBatchSchema>,
) {
  const sourceLangDefault = data.sourceLang ?? "en";
  const translations: string[] = [];
  const fromCache: boolean[] = [];
  const providers = new Set<string>();
  const toWrite: TranslationCacheEntry[] = [];

  const cacheKeys = data.texts.map((text, i) => {
    const trimmed = text.trim();
    const fieldName = data.fieldNames?.[i] ?? "_";
    return buildTranslationCacheKey({
      lang: data.targetLang,
      contentType: (data.contentType ?? "general") as EducationalContentType,
      lessonId: data.lessonId,
      fieldName,
      source: trimmed,
    });
  });

  const dbHits = await getDbCachedTranslations(cacheKeys);

  for (let i = 0; i < data.texts.length; i++) {
    const text = data.texts[i] ?? "";
    const trimmed = text.trim();
    if (!trimmed) {
      translations.push(text);
      fromCache.push(true);
      continue;
    }

    const cacheKey = cacheKeys[i]!;
    const dbHit = dbHits.get(cacheKey);
    if (dbHit) {
      translations.push(dbHit);
      fromCache.push(true);
      providers.add("cache");
      continue;
    }

    const sourceLang = sourceLangForText(trimmed, sourceLangDefault);
    const segments = splitIslamicProtectedText(trimmed);
    const parts = translatableSegments(segments);
    if (parts.length === 0) {
      translations.push(trimmed);
      fromCache.push(true);
      providers.add("protected");
      continue;
    }

    const translatedParts: string[] = [];
    let provider = "none";
    let translated = false;

    for (const part of parts) {
      const result = await igniteTranslateText(part, data.targetLang, sourceLang);
      translatedParts.push(result.text);
      if (result.translated) {
        translated = true;
        provider = result.provider;
      }
    }

    const merged = mergeProtectedSegments(segments, translatedParts);
    translations.push(merged);
    fromCache.push(false);
    providers.add(provider);

    if (translated && merged !== trimmed) {
      toWrite.push({
        cacheKey,
        sourceText: trimmed,
        sourceLang,
        targetLang: data.targetLang,
        contentType: (data.contentType ?? "general") as EducationalContentType,
        lessonId: data.lessonId,
        fieldName: data.fieldNames?.[i],
        translatedText: merged,
        provider,
      });
    }
  }

  if (toWrite.length > 0) {
    await setDbCachedTranslations(toWrite);
  }

  return {
    translations,
    fromCache,
    serviceAvailable: isIgniteAiConfigured() || providers.size > 1,
    providers: [...providers],
  };
}

export const igniteTranslateBatch = createServerFn({ method: "POST" })
  .inputValidator(translateBatchSchema)
  .handler(async ({ data }) => handleIgniteTranslateBatch(data));

export const igniteVocabSuggest = createServerFn({ method: "POST" })
  .inputValidator(vocabSuggestSchema)
  .handler(async ({ data }) => igniteSuggestVocabMeanings(data));

export const ignitePregenerateLesson = createServerFn({ method: "POST" })
  .inputValidator(pregenerateSchema)
  .handler(async ({ data }) =>
    ignitePregenerateLessonTranslations({
      lessonId: data.lessonId,
      fields: data.fields.map((f) => ({
        ...f,
        contentType: f.contentType as EducationalContentType,
      })),
    }),
  );

const cacheWarmSchema = z.object({
  entries: z.array(
    z.object({
      cacheKey: z.string(),
      sourceText: z.string(),
      sourceLang: z.enum(["en", "ar"]),
      targetLang: translatableLang,
      contentType: z.string().optional(),
      lessonId: z.string().optional(),
      fieldName: z.string().optional(),
      translatedText: z.string(),
      provider: z.string().optional(),
    }),
  ),
});

export async function handleCacheWarmTranslations(
  data: z.infer<typeof cacheWarmSchema>,
) {
  await setDbCachedTranslations(
    data.entries.map((e) => ({
      ...e,
      contentType: e.contentType as EducationalContentType | undefined,
      provider: e.provider ?? "openai",
    })),
  );
  return { ok: true };
}

export const igniteCacheWarm = createServerFn({ method: "POST" })
  .inputValidator(cacheWarmSchema)
  .handler(async ({ data }) => handleCacheWarmTranslations(data));
