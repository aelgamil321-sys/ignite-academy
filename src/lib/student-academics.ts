/** Student academic grouping values stored on public.profiles. */

import type { Lang } from "./i18n-config";
import { contentLocale } from "./i18n-config";

export const ISLAMIC_GROUPS = ["A", "B"] as const;
export const STUDENT_SECTIONS = ["A", "B", "C", "D", "E", "F"] as const;

export type IslamicGroup = (typeof ISLAMIC_GROUPS)[number];
export type StudentSection = (typeof STUDENT_SECTIONS)[number];

/** Profile columns used for future grade / section / group analytics. */
export const PROFILE_ANALYTICS_DIMENSIONS = [
  "grade",
  "section",
  "islamic_group",
] as const;

export type ProfileAnalyticsDimension = (typeof PROFILE_ANALYTICS_DIMENSIONS)[number];

export type StudentAcademicFields = {
  section: StudentSection | null;
  islamic_group: IslamicGroup | null;
};

export function normalizeIslamicGroup(value: string | null | undefined): IslamicGroup | null {
  const v = (value ?? "").trim().toUpperCase();
  return (ISLAMIC_GROUPS as readonly string[]).includes(v) ? (v as IslamicGroup) : null;
}

export function normalizeStudentSection(value: string | null | undefined): StudentSection | null {
  const v = (value ?? "").trim().toUpperCase();
  return (STUDENT_SECTIONS as readonly string[]).includes(v) ? (v as StudentSection) : null;
}

export function islamicGroupLabel(group: IslamicGroup | null | undefined, lang: Lang | "en" | "ar"): string {
  const displayLang = contentLocale(lang as Lang);
  if (!group) return displayLang === "ar" ? "غير محدد" : "Not set";
  if (group === "A") return displayLang === "ar" ? "إسلامي A" : "Islamic A";
  return displayLang === "ar" ? "إسلامي B" : "Islamic B";
}

export function sectionLabel(section: StudentSection | null | undefined, lang: Lang | "en" | "ar"): string {
  const displayLang = contentLocale(lang as Lang);
  if (!section) return displayLang === "ar" ? "غير محدد" : "Not set";
  return displayLang === "ar" ? `الشعبة ${section}` : `Section ${section}`;
}

export function formatStudentAcademics(
  fields: StudentAcademicFields,
  lang: Lang | "en" | "ar",
): string {
  const parts = [
    sectionLabel(fields.section, lang),
    islamicGroupLabel(fields.islamic_group, lang),
  ];
  return parts.join(lang === "ar" ? " · " : " · ");
}
