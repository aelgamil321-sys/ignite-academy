import type { Bi } from "@/lib/curriculum";
import { deByEn } from "@/lib/i18n/locales/de";
import { frByEn } from "@/lib/i18n/locales/fr";
import { urByEn } from "@/lib/i18n/locales/ur";
import { zhByEn } from "@/lib/i18n/locales/zh";

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

/** Map browser locale to a supported UI language; defaults to Arabic. */
export function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "ar";
  const codes = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const raw of codes) {
    if (!raw) continue;
    const base = raw.toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return "ar";
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

const L_BY_EN: Record<Exclude<Lang, "en" | "ar">, Record<string, string>> = {
  fr: frByEn,
  de: deByEn,
  ur: urByEn,
  zh: zhByEn,
};

export function L(en: string, ar: string): Record<Lang, string> {
  return {
    en,
    ar,
    fr: L_BY_EN.fr[en] ?? en,
    de: L_BY_EN.de[en] ?? en,
    ur: L_BY_EN.ur[en] ?? en,
    zh: L_BY_EN.zh[en] ?? en,
  };
}

/** Static bilingual UI copy (badges, notifications) for all six locales. */
export function uiBi(text: Bi, lang: Lang): string {
  const en = text.en?.trim() || text.ar?.trim() || "";
  const ar = text.ar?.trim() || text.en?.trim() || "";
  if (!en && !ar) return "";
  return L(en, ar)[lang];
}

export function pickBi(text: Bi, lang: Lang): string {
  if (lang === "ar") return text.ar;
  if (lang === "en") return text.en;
  return text.en || text.ar;
}

export function pickBiLocale(text: Bi, locale: ContentLocale): string {
  return text[locale] || text.en || text.ar;
}
