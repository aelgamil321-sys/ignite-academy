import type { Bi } from "@/lib/curriculum";
import { readLessonLangSlot, containsArabicScript, containsLatinScript } from "@/lib/lesson-multilingual-resolve";
import type { LessonLang } from "@/lib/lesson-localized";
import { isLessonLangSlotMissing } from "@/lib/lesson-multilingual-resolve";

/**
 * Vocabulary word slots require a localized term per language.
 * Identical Arabic copy from the source term does not satisfy en/fr/de/ur/zh.
 */
export function isVocabWordLangSlotMissing(word: Bi | undefined, lang: LessonLang): boolean {
  if (!word) return true;
  const value = readLessonLangSlot(word, lang);
  if (!value) return true;
  const canonical = getCanonicalVocabTermAr(word);
  if (lang !== "ar" && canonical && value.trim() === canonical.trim()) return true;
  return isLessonLangSlotMissing(word, lang);
}

/**
 * Canonical Arabic Qur'anic source term (stored under `word.ar`).
 * Used for optional secondary display — never as a substitute for localized terms.
 */
export function getCanonicalVocabTermAr(word: Bi | undefined): string | null {
  if (!word) return null;
  const ar = readLessonLangSlot(word, "ar");
  if (ar && containsArabicScript(ar)) return ar;
  const en = readLessonLangSlot(word, "en");
  if (en && containsArabicScript(en) && !containsLatinScript(en)) return en;
  return null;
}

/** Optional educational subtitle when localized term differs from Arabic source. */
export function vocabArabicSourceSubtitle(word: Bi | undefined, localizedTerm: string): string | null {
  const canonical = getCanonicalVocabTermAr(word);
  if (!canonical) return null;
  const term = localizedTerm.trim();
  if (!term || term === canonical.trim()) return null;
  return canonical;
}
