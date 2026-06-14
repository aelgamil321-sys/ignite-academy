import { translateContentBatch } from "@/lib/api/translate.functions";
import type { Bi } from "@/lib/curriculum";
import type { Lang } from "@/lib/i18n-config";
import { pickBiLocale, contentLocale } from "@/lib/i18n-config";
import {
  getCachedTranslation,
  setCachedTranslation,
} from "@/lib/translation-cache";

export type TranslatableLang = Exclude<Lang, "en" | "ar">;

export function needsDynamicTranslation(lang: Lang): boolean {
  return lang !== "en" && lang !== "ar";
}

function sourceLangForText(text: string, bi?: Bi): "en" | "ar" {
  if (bi?.en?.trim()) return "en";
  if (bi?.ar?.trim() && !bi?.en?.trim()) return "ar";
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

type QueueItem = {
  text: string;
  targetLang: TranslatableLang;
  sourceLang: "en" | "ar";
  resolve: (value: string) => void;
  reject: (error: unknown) => void;
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

  const batch = pendingQueue.splice(0, 24);
  const byGroup = new Map<string, QueueItem[]>();

  for (const item of batch) {
    const key = `${item.targetLang}:${item.sourceLang}`;
    const group = byGroup.get(key) ?? [];
    group.push(item);
    byGroup.set(key, group);
  }

  await Promise.all(
    Array.from(byGroup.entries()).map(async ([groupKey, items]) => {
      const [targetLang, sourceLang] = groupKey.split(":") as [TranslatableLang, "en" | "ar"];
      const texts = items.map((i) => i.text);

      try {
        const { translations } = await translateContentBatch({
          data: { texts, targetLang, sourceLang },
        });
        items.forEach((item, index) => {
          const translated = translations[index] ?? englishFallback(item.text);
          setCachedTranslation(item.targetLang, item.text, translated);
          item.resolve(translated);
        });
      } catch (error) {
        items.forEach((item) => {
          const fallback = englishFallback(item.text);
          setCachedTranslation(item.targetLang, item.text, fallback);
          item.resolve(fallback);
          item.reject(error);
        });
      }
    }),
  );

  if (pendingQueue.length > 0) scheduleFlush();
}

function queueTranslation(
  text: string,
  targetLang: TranslatableLang,
  sourceLang: "en" | "ar",
): Promise<string> {
  return new Promise((resolve, reject) => {
    pendingQueue.push({ text, targetLang, sourceLang, resolve, reject });
    scheduleFlush();
  });
}

/**
 * Translate a single string for fr/de/ur/zh with Islamic text protection.
 * Arabic and English return unchanged (use stored lesson content).
 * Fallback: selected language → English → Arabic.
 */
export async function translateContent(text: string, targetLanguage: Lang): Promise<string> {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return text ?? "";

  if (targetLanguage === "ar") return trimmed;
  if (targetLanguage === "en") return trimmed;

  const cached = getCachedTranslation(targetLanguage, trimmed);
  if (cached) return cached;

  const sourceLang = sourceLangForText(trimmed);
  try {
    const translated = await queueTranslation(trimmed, targetLanguage, sourceLang);
    if (translated && translated !== trimmed) {
      setCachedTranslation(targetLanguage, trimmed, translated);
      return translated;
    }
  } catch {
    // fall through to English
  }

  const en = englishFallback(trimmed);
  if (en && en !== trimmed) return en;
  return arabicFallback(trimmed);
}

/** Translate a bilingual CMS field without duplicating database records. */
export async function translateBi(bi: Bi, targetLanguage: Lang): Promise<string> {
  if (targetLanguage === "ar") return pickBiLocale(bi, "ar");
  if (targetLanguage === "en") return pickBiLocale(bi, "en");

  const source = bi.en?.trim() || bi.ar?.trim() || "";
  if (!source) return "";

  const cached = getCachedTranslation(targetLanguage, source);
  if (cached) return cached;

  const translated = await translateContent(source, targetLanguage);
  setCachedTranslation(targetLanguage, source, translated);
  return translated;
}

/** Sync display string before async translation completes. */
export function biDisplayFallback(bi: Bi, lang: Lang): string {
  return pickBiLocale(bi, contentLocale(lang));
}

/** Prefetch translations for many strings (e.g. lesson page load). */
export function prefetchTranslations(texts: string[], targetLanguage: Lang): void {
  if (!needsDynamicTranslation(targetLanguage)) return;
  for (const text of texts) {
    const trimmed = text?.trim();
    if (!trimmed || getCachedTranslation(targetLanguage, trimmed)) continue;
    void translateContent(trimmed, targetLanguage);
  }
}
