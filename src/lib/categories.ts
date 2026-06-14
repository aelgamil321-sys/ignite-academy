import type { Bi } from "./curriculum";

export type SubjectCategory = "quran" | "hadith" | "aqeedah" | "fiqh" | "seerah" | "values";

export const SUBJECT_CATEGORIES: Array<{
  slug: SubjectCategory;
  name: Bi;
  desc: Bi;
}> = [
  { slug: "quran", name: { en: "Quran", ar: "القرآن الكريم" }, desc: { en: "Recitation, Tajweed & Tafsir", ar: "التلاوة والتجويد والتفسير" } },
  { slug: "hadith", name: { en: "Hadith", ar: "الحديث الشريف" }, desc: { en: "Sayings of the Prophet ﷺ", ar: "أحاديث النبي ﷺ" } },
  { slug: "aqeedah", name: { en: "Aqeedah", ar: "العقيدة" }, desc: { en: "Foundations of Faith", ar: "أصول الإيمان" } },
  { slug: "fiqh", name: { en: "Fiqh", ar: "الفقه" }, desc: { en: "Islamic Jurisprudence", ar: "أحكام الشريعة الإسلامية" } },
  { slug: "seerah", name: { en: "Seerah", ar: "السيرة النبوية" }, desc: { en: "The Prophetic Biography", ar: "سيرة النبي ﷺ" } },
  { slug: "values", name: { en: "Islamic Values", ar: "القيم الإسلامية" }, desc: { en: "Akhlaq & Manners", ar: "الأخلاق والآداب" } },
];

export function getSubjectCategory(slug: string) {
  return SUBJECT_CATEGORIES.find((c) => c.slug === slug);
}

import type { Lang } from "./i18n-config";
import { contentLocale } from "./i18n-config";

export function subjectCategoryName(slug: string, lang: Lang | "en" | "ar"): string {
  const displayLang = contentLocale(lang as Lang);
  return getSubjectCategory(slug)?.name[displayLang] ?? slug;
}
