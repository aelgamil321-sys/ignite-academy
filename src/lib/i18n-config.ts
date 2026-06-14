import type { Bi } from "@/lib/curriculum";

export const LANG_STORAGE_KEY = "iia.lang";

export type Lang = "en" | "ar" | "fr" | "de" | "ur" | "zh";

export type ContentLocale = "en" | "ar";

export type LangOption = {
  code: Lang;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
};

export const LANG_OPTIONS: LangOption[] = [
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" },
  { code: "de", label: "German", nativeLabel: "Deutsch", dir: "ltr" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl" },
  { code: "zh", label: "Chinese", nativeLabel: "中文", dir: "ltr" },
];

const LANG_SET = new Set<string>(LANG_OPTIONS.map((option) => option.code));

export function isLang(value: string | null | undefined): value is Lang {
  return !!value && LANG_SET.has(value);
}

export function isRtlLang(lang: Lang): boolean {
  return lang === "ar" || lang === "ur";
}

export function langDir(lang: Lang): "ltr" | "rtl" {
  return isRtlLang(lang) ? "rtl" : "ltr";
}

/** Curriculum and lesson content only exist in English and Arabic. */
export function contentLocale(lang: Lang): ContentLocale {
  return lang === "ar" ? "ar" : "en";
}

export function localeForFormatting(lang: Lang): string {
  switch (lang) {
    case "ar":
      return "ar-EG";
    case "ur":
      return "ur-PK";
    case "fr":
      return "fr-FR";
    case "de":
      return "de-DE";
    case "zh":
      return "zh-CN";
    default:
      return "en-GB";
  }
}

export function L(en: string, ar: string): Record<Lang, string> {
  const fallback = en || ar;
  return { en, ar, fr: fallback, de: fallback, ur: fallback, zh: fallback };
}

export function pickBi(text: Bi, lang: Lang): string {
  if (lang === "ar") return text.ar;
  if (lang === "en") return text.en;
  return text.en || text.ar;
}

export function pickBiLocale(text: Bi, locale: ContentLocale): string {
  return text[locale] || text.en || text.ar;
}
