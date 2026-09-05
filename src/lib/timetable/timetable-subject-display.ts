import type { Lang } from "@/lib/i18n-config";
import { L } from "@/lib/i18n-config";

/** Canonical timetable subject codes → localized display labels. Stored code is never changed. */
const SUBJECT_CODE_LABELS: Record<string, Record<Lang, string>> = {
  ISL: L("Islamic Education", "التربية الإسلامية"),
  QUR: L("Qur'an", "القرآن الكريم"),
  QURAN: L("Qur'an", "القرآن الكريم"),
};

const WEEKDAY_LABELS: Record<string, Record<Lang, string>> = {
  Monday: L("Monday", "الاثنين"),
  Tuesday: L("Tuesday", "الثلاثاء"),
  Wednesday: L("Wednesday", "الأربعاء"),
  Thursday: L("Thursday", "الخميس"),
  Friday: L("Friday", "الجمعة"),
};

/** Localize a stored subject code for display; preserve unknown/raw OCR text unchanged. */
export function displayTimetableSubjectCode(code: string | undefined | null, lang: Lang): string {
  const raw = (code ?? "").trim();
  if (!raw) return "";
  const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const labels = SUBJECT_CODE_LABELS[key];
  if (labels) return labels[lang];
  return raw;
}

/** Localize weekday name for timetable grid headers. */
export function displayTimetableWeekday(day: string, lang: Lang): string {
  const labels = WEEKDAY_LABELS[day];
  if (labels) return labels[lang];
  return day;
}
