import type { Lang } from "@/lib/i18n-config";
import { L } from "@/lib/i18n-config";

/** Stable warning codes persisted in lesson AI metadata. */
export const LESSON_GENERATION_WARNING = {
  SACRED_TEXT_REVIEW: "sacred_text_review",
  SACRED_TEXT_CORRUPTED: "sacred_text_corrupted",
  TRANSLATION_INCOMPLETE: "translation_incomplete",
} as const;

const LEGACY_WARNING_MAP: Record<string, keyof typeof LESSON_GENERATION_WARNING | null> = {
  "Sacred-text verification recommended": "SACRED_TEXT_REVIEW",
  "Translation incomplete — some languages may be missing": "TRANSLATION_INCOMPLETE",
};

const WARNING_LABELS: Record<
  (typeof LESSON_GENERATION_WARNING)[keyof typeof LESSON_GENERATION_WARNING],
  Record<Lang, string>
> = {
  [LESSON_GENERATION_WARNING.SACRED_TEXT_REVIEW]: L(
    "Sacred-text verification recommended",
    "يُنصح بالتحقق من النصوص الشرعية",
  ),
  [LESSON_GENERATION_WARNING.SACRED_TEXT_CORRUPTED]: L(
    "Unreadable sacred-text characters detected — verify before publishing",
    "تم اكتشاف رموز غير مقروءة في نص شرعي — يُرجى التحقق قبل النشر",
  ),
  [LESSON_GENERATION_WARNING.TRANSLATION_INCOMPLETE]: L(
    "Translation incomplete — some languages may be missing",
    "الترجمة غير مكتملة — قد تكون بعض اللغات مفقودة",
  ),
};

export function normalizeLessonGenerationWarningCode(warning: string): string {
  const trimmed = warning.trim();
  if (Object.values(LESSON_GENERATION_WARNING).includes(trimmed as never)) return trimmed;
  const legacy = LEGACY_WARNING_MAP[trimmed];
  return legacy ? LESSON_GENERATION_WARNING[legacy] : trimmed;
}

export function localizeLessonGenerationWarning(warning: string, lang: Lang): string {
  const code = normalizeLessonGenerationWarningCode(warning);
  const labels = WARNING_LABELS[code as keyof typeof WARNING_LABELS];
  if (labels) return labels[lang];
  return warning;
}
