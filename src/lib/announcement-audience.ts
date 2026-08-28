import type { Bi } from "@/lib/curriculum";
import { normalizeStudentSection, type StudentSection } from "@/lib/student-academics";
import type { AnnouncementTopic } from "@/lib/announcement-topics";

export type AnnouncementAudience = "all" | "students" | "teachers" | "parents";

export const ANNOUNCEMENT_AUDIENCES: AnnouncementAudience[] = [
  "all",
  "students",
  "teachers",
  "parents",
];

/** Class-scoped teachers may only target students or parents (enforced by RLS). */
export const TEACHER_ANNOUNCEMENT_AUDIENCES: AnnouncementAudience[] = [
  "students",
  "parents",
];

export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, Bi> = {
  all: { en: "All", ar: "الجميع" },
  students: { en: "Students", ar: "الطلاب" },
  teachers: { en: "Teachers", ar: "المعلمون" },
  parents: { en: "Parents", ar: "أولياء الأمور" },
};

export function announcementAudienceLabel(audience: AnnouncementAudience): Bi {
  return ANNOUNCEMENT_AUDIENCE_LABELS[audience];
}

export function normalizeAnnouncementAudience(
  value: string | null | undefined,
): AnnouncementAudience | null {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "all" || v === "students" || v === "teachers" || v === "parents") {
    return v;
  }
  return null;
}

export function normalizeAnnouncementTopic(
  value: string | null | undefined,
): AnnouncementTopic | null {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "school_news" || v === "exams" || v === "events" || v === "parents") {
    return v;
  }
  return null;
}

export function normalizeTargetSection(value: string | null | undefined): StudentSection | null {
  if (!value || value.trim() === "") return null;
  return normalizeStudentSection(value);
}
