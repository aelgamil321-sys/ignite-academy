import { grades } from "./curriculum";
import type { Lang } from "./i18n-config";
import { contentLocale } from "./i18n-config";

const SLUG_ALIASES: Record<string, string> = {
  "grade-8": "8", "grade 8": "8", "grade8": "8",
  "grade-1": "1", "grade-2": "2", "grade-3": "3", "grade-4": "4", "grade-5": "5",
  "grade-6": "6", "grade-7": "7", "grade-9": "9", "grade-10": "10", "grade-11": "11", "grade-12": "12",
};

/** Normalize any grade label to the curriculum slug (e.g. "Grade 8" → "8"). */
export function normalizeGradeSlug(value: string): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  const lower = v.toLowerCase();
  if (SLUG_ALIASES[lower]) return SLUG_ALIASES[lower];
  const bySlug = grades.find((g) => g.slug === v || g.slug === lower);
  if (bySlug) return bySlug.slug;
  const byName = grades.find(
    (g) => g.name.en.toLowerCase() === lower || g.name.ar === v,
  );
  if (byName) return byName.slug;
  return v;
}

export function gradeMatches(stored: string, slug: string): boolean {
  return normalizeGradeSlug(stored) === normalizeGradeSlug(slug);
}

export function gradeDisplayName(slug: string, lang: Lang | "en" | "ar"): string {
  const displayLang = contentLocale(lang as Lang);
  const g = grades.find((x) => x.slug === normalizeGradeSlug(slug));
  return g?.name[displayLang] ?? slug;
}
