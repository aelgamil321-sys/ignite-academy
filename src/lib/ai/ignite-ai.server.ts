import type { Lang } from "@/lib/i18n-config";
import { hasProtectedIslamicContent } from "@/lib/islamic-text-protection";
import {
  mergeProtectedSegments,
  splitIslamicProtectedText,
  translatableSegments,
} from "@/lib/islamic-text-protection";
import { machineTranslateText } from "@/lib/translate.server";
import type { EducationalContentType } from "@/lib/translate-educational-content";

export const AI_DISABLED_MESSAGE_AR = "خدمة الذكاء الاصطناعي غير مفعلة بعد.";
export const AI_DISABLED_MESSAGE_EN = "AI service is not enabled yet.";

export type TranslatableLang = Exclude<Lang, "en" | "ar">;

export type VocabAiSuggestion = {
  meaning: {
    ar: string;
    en: string;
    fr: string;
    de: string;
    ur: string;
    zh: string;
  };
  note?: string;
  protectedContent: boolean;
};

export type LessonAiField = {
  fieldName: string;
  contentType: EducationalContentType;
  text: string;
  sourceLang?: "en" | "ar";
};

/** True when OpenAI or Google Translate API is configured on the worker. */
export function isIgniteAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY);
}

function openAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

async function openAiChat(
  system: string,
  user: string,
  json = false,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAiModel(),
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) return null;
    const jsonBody = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return jsonBody.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

const ISLAMIC_SYSTEM_PROMPT = `You are an educational assistant for Ignite Islamic Academy.
Rules:
- NEVER translate Qur'an verses (text inside ﴿…﴾).
- NEVER translate Hadith Arabic text or lines starting with: قال الله تعالى, قال رسول الله, عن النبي, رواه.
- Preserve ﷺ and Islamic honorifics.
- Use accurate, student-friendly language suitable for Islamic Studies.
- If unsure about a religious term, explain clearly rather than inventing.
- For vocabulary, give concise dictionary-style meanings.`;

/** Translate one text segment with Islamic protection + provider fallback. */
export async function igniteTranslateText(
  text: string,
  targetLang: TranslatableLang,
  sourceLang: "en" | "ar" = "en",
): Promise<{ text: string; translated: boolean; provider: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { text: trimmed, translated: false, provider: "none" };

  if (hasProtectedIslamicContent(trimmed)) {
    return { text: trimmed, translated: false, provider: "protected" };
  }

  const segments = splitIslamicProtectedText(trimmed);
  const parts = translatableSegments(segments);
  if (parts.length === 0) {
    return { text: trimmed, translated: false, provider: "protected" };
  }

  const translatedParts: string[] = [];
  let provider = "none";
  let anyTranslated = false;

  for (const part of parts) {
    if (hasProtectedIslamicContent(part)) {
      translatedParts.push(part);
      continue;
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      const langName =
        targetLang === "fr"
          ? "French"
          : targetLang === "de"
            ? "German"
            : targetLang === "ur"
              ? "Urdu"
              : "Simplified Chinese";
      const out = await openAiChat(
        ISLAMIC_SYSTEM_PROMPT,
        `Translate the following ${sourceLang === "ar" ? "Arabic" : "English"} Islamic Studies text into ${langName}. Return ONLY the translation.\n\n${part}`,
      );
      if (out && out !== part) {
        translatedParts.push(out);
        provider = "openai";
        anyTranslated = true;
        continue;
      }
    }

    const machine = await machineTranslateText(part, targetLang, sourceLang);
    translatedParts.push(machine.text);
    if (machine.translated) {
      anyTranslated = true;
      provider = machine.provider ?? "machine";
    }
  }

  const merged = mergeProtectedSegments(segments, translatedParts);
  return {
    text: merged,
    translated: anyTranslated && merged !== trimmed,
    provider,
  };
}

/** Suggest vocabulary meanings in six languages (admin review only). */
export async function igniteSuggestVocabMeanings(input: {
  wordAr: string;
  wordEn: string;
}): Promise<{ suggestion: VocabAiSuggestion | null; serviceAvailable: boolean }> {
  const wordAr = input.wordAr.trim();
  const wordEn = input.wordEn.trim();
  const word = wordAr || wordEn;

  if (!word) {
    return { suggestion: null, serviceAvailable: isIgniteAiConfigured() };
  }

  if (hasProtectedIslamicContent(word)) {
    return {
      suggestion: {
        meaning: { ar: wordAr, en: wordEn, fr: "", de: "", ur: "", zh: "" },
        note: "This text contains protected Qur'an or Hadith content and was not machine-translated.",
        protectedContent: true,
      },
      serviceAvailable: true,
    };
  }

  if (!isIgniteAiConfigured()) {
    return { suggestion: null, serviceAvailable: false };
  }

  const userPrompt = `Word (Arabic): ${wordAr || "(not provided)"}
Word (English): ${wordEn || "(not provided)"}

Return JSON with keys: meaningAr, meaningEn, meaningFr, meaningDe, meaningUr, meaningZh.
Each value is a concise student-friendly definition. If a language cannot be determined, use the English meaning translated appropriately.`;

  const raw = await openAiChat(
    `${ISLAMIC_SYSTEM_PROMPT}\nReturn valid JSON only.`,
    userPrompt,
    true,
  );

  if (!raw) {
    const langs: TranslatableLang[] = ["fr", "de", "ur", "zh"];
    const baseEn = wordEn || wordAr;
    const baseAr = wordAr || wordEn;
    const meaningEn =
      (await igniteTranslateText(baseEn, "fr", "en")).text === baseEn
        ? baseEn
        : baseEn;
    const extra: Record<string, string> = {};
    for (const lang of langs) {
      const src = baseEn || baseAr;
      const r = await igniteTranslateText(src, lang, /[\u0600-\u06FF]/.test(src) ? "ar" : "en");
      extra[lang] = r.text;
    }
    return {
      suggestion: {
        meaning: {
          ar: baseAr,
          en: meaningEn,
          fr: extra.fr ?? "",
          de: extra.de ?? "",
          ur: extra.ur ?? "",
          zh: extra.zh ?? "",
        },
        protectedContent: false,
      },
      serviceAvailable: true,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return {
      suggestion: {
        meaning: {
          ar: String(parsed.meaningAr ?? wordAr).trim(),
          en: String(parsed.meaningEn ?? wordEn).trim(),
          fr: String(parsed.meaningFr ?? "").trim(),
          de: String(parsed.meaningDe ?? "").trim(),
          ur: String(parsed.meaningUr ?? "").trim(),
          zh: String(parsed.meaningZh ?? "").trim(),
        },
        protectedContent: false,
      },
      serviceAvailable: true,
    };
  } catch {
    return { suggestion: null, serviceAvailable: isIgniteAiConfigured() };
  }
}

/** Pre-generate missing lesson translations for all target languages. */
export async function ignitePregenerateLessonTranslations(input: {
  lessonId: string;
  fields: LessonAiField[];
}): Promise<{
  generated: number;
  cached: number;
  skipped: number;
  serviceAvailable: boolean;
  byLanguage: Record<string, number>;
}> {
  const targetLangs: TranslatableLang[] = ["fr", "de", "ur", "zh"];
  const { buildTranslationCacheKey, getDbCachedTranslations, setDbCachedTranslations } =
    await import("@/lib/ai/translation-cache.server");

  if (!isIgniteAiConfigured()) {
    return {
      generated: 0,
      cached: 0,
      skipped: input.fields.length * targetLangs.length,
      serviceAvailable: false,
      byLanguage: {},
    };
  }

  let generated = 0;
  let cached = 0;
  let skipped = 0;
  const byLanguage: Record<string, number> = {};

  for (const targetLang of targetLangs) {
    byLanguage[targetLang] = 0;

    for (const field of input.fields) {
      const trimmed = field.text?.trim();
      if (!trimmed) {
        skipped += 1;
        continue;
      }

      const sourceLang =
        field.sourceLang ??
        (/[\u0600-\u06FF]/.test(trimmed) && !/[A-Za-z]{4,}/.test(trimmed) ? "ar" : "en");

      const cacheKey = buildTranslationCacheKey({
        lang: targetLang,
        contentType: field.contentType,
        lessonId: input.lessonId,
        fieldName: field.fieldName,
        source: trimmed,
      });

      const existing = await getDbCachedTranslations([cacheKey]);
      if (existing.has(cacheKey)) {
        cached += 1;
        continue;
      }

      const result = await igniteTranslateText(trimmed, targetLang, sourceLang);
      if (!result.translated) {
        skipped += 1;
        continue;
      }

      await setDbCachedTranslations([
        {
          cacheKey,
          sourceText: trimmed,
          sourceLang,
          targetLang,
          contentType: field.contentType,
          lessonId: input.lessonId,
          fieldName: field.fieldName,
          translatedText: result.text,
          provider: result.provider,
        },
      ]);

      generated += 1;
      byLanguage[targetLang] += 1;
    }
  }

  return {
    generated,
    cached,
    skipped,
    serviceAvailable: true,
    byLanguage,
  };
}
