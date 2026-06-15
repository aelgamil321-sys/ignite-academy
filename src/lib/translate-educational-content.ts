import type { Bi } from "@/lib/curriculum";
import type { Lang } from "@/lib/i18n-config";
import { pickBiLocale, contentLocale } from "@/lib/i18n-config";
import {
  buildEducationalCacheKey,
  getCachedEducationalTranslation,
  setCachedEducationalTranslation,
} from "@/lib/translation-cache";
import { translateContentBatch } from "@/lib/api/translate.functions";

export type EducationalContentType =
  | "title"
  | "outcome"
  | "content"
  | "vocab_term"
  | "vocab_def"
  | "activity"
  | "worksheet"
  | "instruction"
  | "quiz_question"
  | "quiz_option"
  | "quiz_feedback"
  | "quiz_result"
  | "resource_label"
  | "general";

export type TranslateEducationalInput = {
  text: string;
  targetLanguage: Lang;
  sourceLanguage?: "en" | "ar";
  contentType: EducationalContentType;
  lessonId?: string;
  fieldName?: string;
};

export type TranslateEducationalResult = {
  text: string;
  fromCache: boolean;
  serviceUnavailable: boolean;
};

export type EducationalField = {
  fieldName: string;
  contentType: EducationalContentType;
  text: string;
};

export function needsDynamicTranslation(lang: Lang): boolean {
  return lang !== "en" && lang !== "ar";
}

function sourceLangForText(text: string, preferred?: "en" | "ar"): "en" | "ar" {
  if (preferred) return preferred;
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
}

function englishFallback(text: string, bi?: Bi): string {
  if (bi) return bi.en?.trim() || bi.ar?.trim() || "";
  return text;
}

function arabicFallback(text: string, bi?: Bi): string {
  if (bi) return bi.ar?.trim() || bi.en?.trim() || "";
  return text;
}

/** Sync display before async translation completes. Selected → English → Arabic. */
export function educationalDisplayFallback(
  text: string,
  lang: Lang,
  bi?: Bi,
): string {
  if (lang === "ar") return bi ? pickBiLocale(bi, "ar") : text;
  if (lang === "en") return bi ? pickBiLocale(bi, "en") : text;
  const en = bi ? pickBiLocale(bi, "en") : text;
  if (en?.trim()) return en.trim();
  return bi ? pickBiLocale(bi, "ar") : text;
}

let translationServiceAvailable: boolean | null = null;
const availabilityListeners = new Set<(available: boolean) => void>();

export function isTranslationServiceAvailable(): boolean {
  return translationServiceAvailable !== false;
}

export function onTranslationAvailabilityChange(
  listener: (available: boolean) => void,
): () => void {
  availabilityListeners.add(listener);
  if (translationServiceAvailable !== null) {
    listener(translationServiceAvailable);
  }
  return () => availabilityListeners.delete(listener);
}

function setTranslationServiceAvailable(available: boolean) {
  if (translationServiceAvailable === available) return;
  translationServiceAvailable = available;
  for (const listener of availabilityListeners) {
    listener(available);
  }
}

type QueueItem = TranslateEducationalInput & {
  resolve: (value: TranslateEducationalResult) => void;
};

const pendingQueue: QueueItem[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushTranslationQueue();
  }, 40);
}

async function flushTranslationQueue() {
  if (pendingQueue.length === 0) return;

  const batch = pendingQueue.splice(0, 20);
  const byGroup = new Map<string, QueueItem[]>();

  for (const item of batch) {
    const sourceLang = sourceLangForText(item.text, item.sourceLanguage);
    const key = `${item.targetLanguage}:${sourceLang}`;
    const group = byGroup.get(key) ?? [];
    group.push(item);
    byGroup.set(key, group);
  }

  await Promise.all(
    Array.from(byGroup.entries()).map(async ([groupKey, items]) => {
      const [targetLang, sourceLang] = groupKey.split(":") as [
        Exclude<Lang, "en" | "ar">,
        "en" | "ar",
      ];
      const texts = items.map((i) => i.text);

      try {
        const { translations, serviceAvailable } = await translateContentBatch({
          data: { texts, targetLang, sourceLang },
        });
        setTranslationServiceAvailable(serviceAvailable);

        items.forEach((item, index) => {
          const translated = translations[index] ?? educationalDisplayFallback(item.text, item.targetLanguage);
          const cacheInput = {
            lang: item.targetLanguage,
            contentType: item.contentType,
            lessonId: item.lessonId,
            fieldName: item.fieldName,
            source: item.text,
          };
          setCachedEducationalTranslation(cacheInput, translated);
          item.resolve({
            text: translated,
            fromCache: false,
            serviceUnavailable: !serviceAvailable,
          });
        });
      } catch {
        setTranslationServiceAvailable(false);
        items.forEach((item) => {
          const fallback = educationalDisplayFallback(item.text, item.targetLanguage);
          item.resolve({
            text: fallback,
            fromCache: false,
            serviceUnavailable: true,
          });
        });
      }
    }),
  );

  if (pendingQueue.length > 0) scheduleFlush();
}

/**
 * Translate lesson/quiz educational content for fr/de/ur/zh.
 * Qur'an ayah markers and Hadith lines are protected server-side.
 * Database content is never modified.
 */
export async function translateEducationalContent(
  input: TranslateEducationalInput,
): Promise<TranslateEducationalResult> {
  const trimmed = input.text?.trim() ?? "";
  if (!trimmed) {
    return { text: input.text ?? "", fromCache: false, serviceUnavailable: false };
  }

  if (!needsDynamicTranslation(input.targetLanguage)) {
    return { text: trimmed, fromCache: true, serviceUnavailable: false };
  }

  const cacheInput = {
    lang: input.targetLanguage,
    contentType: input.contentType,
    lessonId: input.lessonId,
    fieldName: input.fieldName,
    source: trimmed,
  };

  const cached = getCachedEducationalTranslation(cacheInput);
  if (cached) {
    return { text: cached, fromCache: true, serviceUnavailable: !isTranslationServiceAvailable() };
  }

  return new Promise((resolve) => {
    pendingQueue.push({ ...input, text: trimmed, resolve });
    scheduleFlush();
  });
}

/** Translate a bilingual CMS field without duplicating database records. */
export async function translateEducationalBi(
  bi: Bi,
  targetLanguage: Lang,
  meta: {
    contentType: EducationalContentType;
    lessonId?: string;
    fieldName?: string;
  },
): Promise<TranslateEducationalResult> {
  if (targetLanguage === "ar") {
    return {
      text: pickBiLocale(bi, "ar"),
      fromCache: true,
      serviceUnavailable: false,
    };
  }
  if (targetLanguage === "en") {
    return {
      text: pickBiLocale(bi, "en"),
      fromCache: true,
      serviceUnavailable: false,
    };
  }

  const source = bi.en?.trim() || bi.ar?.trim() || "";
  if (!source) return { text: "", fromCache: true, serviceUnavailable: false };

  const sourceLanguage: "en" | "ar" = bi.en?.trim() ? "en" : "ar";
  return translateEducationalContent({
    text: source,
    targetLanguage,
    sourceLanguage,
    contentType: meta.contentType,
    lessonId: meta.lessonId,
    fieldName: meta.fieldName,
  });
}

export function prefetchEducationalTranslations(
  lessonId: string,
  fields: EducationalField[],
  targetLanguage: Lang,
): void {
  if (!needsDynamicTranslation(targetLanguage)) return;
  for (const field of fields) {
    const trimmed = field.text?.trim();
    if (!trimmed) continue;
    const cacheInput = {
      lang: targetLanguage,
      contentType: field.contentType,
      lessonId,
      fieldName: field.fieldName,
      source: trimmed,
    };
    if (getCachedEducationalTranslation(cacheInput)) continue;
    void translateEducationalContent({
      text: trimmed,
      targetLanguage,
      contentType: field.contentType,
      lessonId,
      fieldName: field.fieldName,
    });
  }
}

export { englishFallback, arabicFallback, contentLocale };
