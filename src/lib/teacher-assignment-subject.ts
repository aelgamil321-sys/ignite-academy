import type { Lang } from "@/lib/i18n-config";
import { translateKey } from "@/lib/i18n";

export const TEACHING_SUBJECT_TYPES = ["islamic_education", "quran"] as const;

export type TeachingSubjectType = (typeof TEACHING_SUBJECT_TYPES)[number];

export const DEFAULT_TEACHING_SUBJECT: TeachingSubjectType = "islamic_education";

export function isTeachingSubjectType(value: string | null | undefined): value is TeachingSubjectType {
  return TEACHING_SUBJECT_TYPES.includes(value as TeachingSubjectType);
}

export function normalizeTeachingSubjectType(
  value: string | null | undefined,
): TeachingSubjectType {
  if (isTeachingSubjectType(value)) return value;
  return DEFAULT_TEACHING_SUBJECT;
}

export function teachingSubjectLabel(subject: TeachingSubjectType, lang: Lang): string {
  return translateKey(
    subject === "quran" ? "teacher_subject_quran" : "teacher_subject_islamic_education",
    lang,
  );
}

export function teachingSubjectBadgeClass(subject: TeachingSubjectType): string {
  return subject === "quran"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
    : "border-primary/25 bg-primary/10 text-foreground";
}
