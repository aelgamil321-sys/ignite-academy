import type { Lang } from "@/lib/i18n-config";
import { resolveStoredLocalizedText } from "@/lib/localized-content-resolve";

/** All lesson content languages stored in lesson JSONB. */
export const LESSON_LANGS = ["ar", "en", "fr", "de", "ur", "zh"] as const;
export type LessonLang = (typeof LESSON_LANGS)[number];

export type LocalizedText = Record<LessonLang, string>;

export function emptyLocalizedText(): LocalizedText {
  return { ar: "", en: "", fr: "", de: "", ur: "", zh: "" };
}

/** Parse JSONB/localized object; preserves fr/de/ur/zh when present. */
export function parseLocalizedText(raw: unknown): LocalizedText {
  const out = emptyLocalizedText();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    for (const lang of LESSON_LANGS) {
      if (o[lang] !== undefined) out[lang] = String(o[lang] ?? "");
    }
  } else if (typeof raw === "string") {
    try {
      return parseLocalizedText(JSON.parse(raw));
    } catch {
      out.en = raw;
    }
  }
  return out;
}

export function localizedFromSource(text: string, sourceLang: "en" | "ar"): LocalizedText {
  const out = emptyLocalizedText();
  out[sourceLang] = text.trim();
  return out;
}

export function setLocalizedLang(text: LocalizedText, lang: LessonLang, value: string): LocalizedText {
  return { ...text, [lang]: value };
}

export function mergeLocalizedTexts(...parts: Partial<LocalizedText>[]): LocalizedText {
  const out = emptyLocalizedText();
  for (const part of parts) {
    for (const lang of LESSON_LANGS) {
      const v = part[lang]?.trim();
      if (v) out[lang] = v;
    }
  }
  return out;
}

export function hasLocalizedContent(text: LocalizedText, lang: LessonLang): boolean {
  return Boolean(text[lang]?.trim());
}

export function allLessonLangsPresent(text: LocalizedText): boolean {
  return LESSON_LANGS.every((lang) => hasLocalizedContent(text, lang));
}

export function isLessonLang(value: string): value is LessonLang {
  return (LESSON_LANGS as readonly string[]).includes(value);
}

/** Read stored lesson text for a UI language (no machine translation). */
export function resolveStoredLessonText(text: LocalizedText, lang: Lang): string | null {
  return resolveStoredLocalizedText(text as import("@/lib/curriculum").Bi, lang);
}

export function serializeLocalizedText(text: LocalizedText): LocalizedText {
  const out = emptyLocalizedText();
  for (const lang of LESSON_LANGS) {
    out[lang] = text[lang]?.trim() ?? "";
  }
  return out;
}
