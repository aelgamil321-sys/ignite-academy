import type { TimetableFlatSlot, TimetableSchedule, TimetableSlot } from "@/lib/timetable/timetable-types";
import { TIMETABLE_CONFIDENCE_REVIEW_THRESHOLD, TIMETABLE_GRID_VERSION } from "@/lib/timetable/timetable-types";
import { enrichClassSlot } from "@/lib/timetable/timetable-grid";

const CANONICAL_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const DAY_ALIASES: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  الاحد: 0,
  الأحد: 0,
  الاثنين: 1,
  الإثنين: 1,
  الثلاثاء: 2,
  الاربعاء: 3,
  الأربعاء: 3,
  الخميس: 4,
  الجمعة: 5,
  السبت: 6,
};

export function normalizeDayToken(day: string): string {
  return day.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}

export function dayOfWeekFromName(day: string): number | null {
  const token = normalizeDayToken(day);
  if (token in DAY_ALIASES) return DAY_ALIASES[token];
  const english = CANONICAL_DAY_NAMES.find((name) => normalizeDayToken(name) === token);
  if (english) return CANONICAL_DAY_NAMES.indexOf(english);
  return null;
}

export function canonicalDayName(day: string): string {
  const dow = dayOfWeekFromName(day);
  if (dow == null) return day.trim();
  return CANONICAL_DAY_NAMES[dow];
}

export function getLocalDayOfWeek(date = new Date()): number {
  return date.getDay();
}

export function getTodayCanonicalDayName(date = new Date()): string {
  return CANONICAL_DAY_NAMES[getLocalDayOfWeek(date)];
}

export function normalizeTimeToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return trimmed;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return trimmed;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function applySlotNeedsReviewRules(slot: TimetableSlot): TimetableSlot {
  const confidence = Number.isFinite(slot.confidence) ? slot.confidence : 0;

  const normalized: TimetableSlot = {
    ...slot,
    startTime: normalizeTimeToken(slot.startTime),
    endTime: normalizeTimeToken(slot.endTime),
    subject: slot.subject ?? "",
    classLabel: slot.classLabel ?? "",
    grade: slot.grade ?? "",
    section: slot.section ?? "",
    room: slot.room ?? "",
    notes: slot.notes ?? "",
    confidence,
    needsReview: slot.needsReview,
  };

  if (slot.type === "free" || slot.type === "break") {
    return normalized;
  }

  let needsReview =
    normalized.needsReview || confidence < TIMETABLE_CONFIDENCE_REVIEW_THRESHOLD;
  if (!normalized.startTime.trim() || !normalized.endTime.trim()) {
    needsReview = true;
  }
  if (!normalized.subject.trim() || !normalized.classLabel.trim()) {
    needsReview = true;
  }

  return enrichClassSlot({ ...normalized, needsReview });
}

export function normalizeTimetableSchedule(schedule: TimetableSchedule): TimetableSchedule {
  return {
    ...schedule,
    version: schedule.version ?? TIMETABLE_GRID_VERSION,
    days: schedule.days.map((day) => ({
      day: canonicalDayName(day.day),
      slots: day.slots.map((slot) => applySlotNeedsReviewRules(slot)),
    })),
  };
}

export function flattenTimetableSchedule(schedule: TimetableSchedule): TimetableFlatSlot[] {
  const flat: TimetableFlatSlot[] = [];
  for (const day of schedule.days) {
    const dayOfWeek = dayOfWeekFromName(day.day);
    if (dayOfWeek == null) continue;
    for (const slot of day.slots) {
      flat.push({
        ...slot,
        day: canonicalDayName(day.day),
        dayOfWeek,
      });
    }
  }
  return flat;
}

export function sortTimetableSlots(slots: TimetableFlatSlot[]): TimetableFlatSlot[] {
  return [...slots].sort((a, b) => {
    const startCmp = normalizeTimeToken(a.startTime).localeCompare(normalizeTimeToken(b.startTime));
    if (startCmp !== 0) return startCmp;
    const periodA = a.period ?? 99;
    const periodB = b.period ?? 99;
    return periodA - periodB;
  });
}

export function filterTodaySlots(schedule: TimetableSchedule, date = new Date()): TimetableFlatSlot[] {
  const todayDow = getLocalDayOfWeek(date);
  const today = flattenTimetableSchedule(schedule).filter((slot) => slot.dayOfWeek === todayDow);
  return sortTimetableSlots(today);
}

export function scheduleHasNeedsReview(schedule: TimetableSchedule): boolean {
  return schedule.days.some((day) => day.slots.some((slot) => slot.needsReview));
}

/** @deprecated Use filterTodaySlots */
export const filterTodayPeriods = filterTodaySlots;
