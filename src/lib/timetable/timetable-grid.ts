import type { TimetableDay, TimetableSchedule, TimetableSlot } from "@/lib/timetable/timetable-types";
import { TIMETABLE_GRID_VERSION } from "@/lib/timetable/timetable-types";

export const TIMETABLE_SCHOOL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const;

export type TimetableSchoolDay = (typeof TIMETABLE_SCHOOL_DAYS)[number];

export const TIMETABLE_SLOTS_PER_DAY = 8;

/** Canonical period/break times for the school grid. */
export const TIMETABLE_GRID_COLUMNS = [
  { label: "Period 1", period: 1, startTime: "08:00", endTime: "08:50", type: "period" as const },
  { label: "Period 2", period: 2, startTime: "08:50", endTime: "09:40", type: "period" as const },
  { label: "Period 3", period: 3, startTime: "09:40", endTime: "10:30", type: "period" as const },
  { label: "Period 4", period: 4, startTime: "10:30", endTime: "11:20", type: "period" as const },
  { label: "BREAK", period: null, startTime: "11:20", endTime: "12:10", type: "break" as const },
  { label: "Period 5", period: 5, startTime: "12:10", endTime: "13:00", type: "period" as const },
  { label: "Period 6", period: 6, startTime: "13:00", endTime: "13:50", type: "period" as const },
  { label: "Period 7", period: 7, startTime: "13:50", endTime: "14:35", type: "period" as const },
];

/** Derive grade/section for filtering — never replaces classLabel. */
export function deriveGradeSectionFromClassLabel(classLabel: string): { grade: string; section: string } {
  const label = classLabel.trim();
  if (!label) return { grade: "", section: "" };

  const slashParts = label.split("/");
  if (slashParts.length === 2) {
    const left = slashParts[0]?.match(/^(G?\d+)([A-Z]+)$/i);
    const right = slashParts[1]?.match(/^(G?\d+)([A-Z]+)$/i);
    if (left && right) {
      const grade = left[1]!.toUpperCase().startsWith("G") ? left[1]!.toUpperCase() : `G${left[1]}`;
      const rightGrade = right[1]!.toUpperCase().startsWith("G") ? right[1]!.toUpperCase() : `G${right[1]}`;
      if (grade === rightGrade) {
        return { grade, section: `${left[2]!.toUpperCase()}/${right[2]!.toUpperCase()}` };
      }
    }
  }

  const single = label.match(/^(G?\d+)([A-Z]+)$/i);
  if (single) {
    const grade = single[1]!.toUpperCase().startsWith("G") ? single[1]!.toUpperCase() : `G${single[1]}`;
    return { grade, section: single[2]!.toUpperCase() };
  }

  return { grade: "", section: "" };
}

export function enrichClassSlot(slot: TimetableSlot): TimetableSlot {
  if (slot.type !== "class" || !slot.classLabel.trim()) return slot;
  const derived = deriveGradeSectionFromClassLabel(slot.classLabel);
  return {
    ...slot,
    grade: slot.grade.trim() || derived.grade,
    section: slot.section.trim() || derived.section,
  };
}

type LegacyPeriod = {
  period: number;
  startTime: string;
  endTime: string;
  grade?: string;
  section?: string;
  subject?: string;
  room?: string;
  notes?: string;
  confidence?: number;
  needsReview?: boolean;
  classLabel?: string;
};

type LegacyDay = { day: string; periods?: LegacyPeriod[]; slots?: TimetableSlot[] };

function legacyPeriodToSlot(period: LegacyPeriod): TimetableSlot {
  const grade = period.grade ?? "";
  const section = period.section ?? "";
  const classLabel =
    period.classLabel?.trim() ||
    (grade && section ? `${grade}${section}` : grade || section || "");
  return {
    type: "class",
    period: period.period,
    startTime: period.startTime,
    endTime: period.endTime,
    subject: period.subject ?? "",
    classLabel,
    grade,
    section,
    room: period.room ?? "",
    notes: period.notes ?? "",
    confidence: period.confidence ?? 0.5,
    needsReview: period.needsReview ?? true,
  };
}

export function coerceDayToGrid(day: LegacyDay): TimetableDay {
  if (Array.isArray(day.slots) && day.slots.length > 0) {
    return { day: day.day, slots: day.slots };
  }
  if (Array.isArray(day.periods)) {
    return {
      day: day.day,
      slots: day.periods.map(legacyPeriodToSlot),
    };
  }
  return { day: day.day, slots: [] };
}

export function coerceScheduleToGrid(raw: unknown): TimetableSchedule | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as { days?: LegacyDay[]; confirmedAt?: string; version?: number };
  if (!Array.isArray(value.days)) return null;
  return ensureFixedGridSchedule({
    confirmedAt: value.confirmedAt,
    version: value.version ?? TIMETABLE_GRID_VERSION,
    days: value.days.map(coerceDayToGrid),
  });
}

export function slotsMatchFixture(actual: TimetableSlot[], expected: TimetableSlot[]): boolean {
  if (actual.length !== expected.length) return false;
  return actual.every((slot, index) => {
    const exp = expected[index]!;
    return (
      slot.type === exp.type &&
      slot.period === exp.period &&
      slot.startTime === exp.startTime &&
      slot.endTime === exp.endTime &&
      slot.subject === exp.subject &&
      slot.classLabel === exp.classLabel &&
      slot.grade === exp.grade &&
      slot.section === exp.section &&
      slot.needsReview === exp.needsReview
    );
  });
}

export function daySlotsEqual(actual: TimetableDay, expected: TimetableDay): boolean {
  return actual.day === expected.day && slotsMatchFixture(actual.slots, expected.slots);
}

function matchSchoolDay(day: string): TimetableSchoolDay | null {
  const token = day.trim().toLowerCase();
  return TIMETABLE_SCHOOL_DAYS.find((name) => name.toLowerCase() === token) ?? null;
}

function buildTemplateFreeSlot(period: number): TimetableSlot {
  const col = TIMETABLE_GRID_COLUMNS.find((c) => c.period === period && c.type === "period");
  if (!col) throw new Error(`Missing period ${period}`);
  return {
    type: "free",
    period,
    startTime: col.startTime,
    endTime: col.endTime,
    subject: "",
    classLabel: "",
    grade: "",
    section: "",
    room: "",
    notes: "",
    confidence: 1,
    needsReview: false,
  };
}

function buildTemplateBreakSlot(): TimetableSlot {
  const col = TIMETABLE_GRID_COLUMNS.find((c) => c.type === "break");
  if (!col) throw new Error("Missing break column");
  return {
    type: "break",
    period: null,
    startTime: col.startTime,
    endTime: col.endTime,
    subject: "",
    classLabel: "",
    grade: "",
    section: "",
    room: "",
    notes: "",
    confidence: 1,
    needsReview: false,
  };
}

/** Fixed 8-slot day template: P1–P4, Break, P5–P7. */
export function buildTemplateDaySlots(): TimetableSlot[] {
  const slots: TimetableSlot[] = [];
  for (const col of TIMETABLE_GRID_COLUMNS) {
    if (col.type === "break") {
      slots.push(buildTemplateBreakSlot());
    } else if (col.period != null) {
      slots.push(buildTemplateFreeSlot(col.period));
    }
  }
  return slots;
}

/** Empty fixed weekly grid — every teaching cell is free, breaks locked. */
export function buildEmptyFixedSchedule(): TimetableSchedule {
  return {
    version: TIMETABLE_GRID_VERSION,
    days: TIMETABLE_SCHOOL_DAYS.map((day) => ({
      day,
      slots: buildTemplateDaySlots(),
    })),
  };
}

function overlayTeachingSlot(template: TimetableSlot, source: TimetableSlot | undefined): TimetableSlot {
  if (template.type === "break") return template;
  if (!source || source.type === "break") return template;

  if (source.type === "free") {
    return {
      ...template,
      type: "free",
      subject: "",
      classLabel: "",
      grade: "",
      section: "",
      room: "",
      notes: "",
      confidence: source.confidence ?? 1,
      needsReview: source.needsReview ?? false,
    };
  }

  const enriched = enrichClassSlot(source);
  return {
    ...template,
    type: "class",
    subject: enriched.subject,
    classLabel: enriched.classLabel,
    grade: enriched.grade,
    section: enriched.section,
    room: enriched.room ?? "",
    notes: enriched.notes ?? "",
    confidence: enriched.confidence ?? 1,
    needsReview: enriched.needsReview ?? false,
  };
}

/** Merge any schedule into the fixed 40-slot grid; missing cells become free. */
export function ensureFixedGridSchedule(
  schedule: TimetableSchedule | null | undefined,
): TimetableSchedule {
  const template = buildEmptyFixedSchedule();
  if (!schedule?.days?.length) return template;

  const dayMap = new Map<TimetableSchoolDay, TimetableDay>();
  for (const day of schedule.days) {
    const key = matchSchoolDay(day.day);
    if (key) dayMap.set(key, day);
  }

  return {
    ...schedule,
    version: TIMETABLE_GRID_VERSION,
    days: TIMETABLE_SCHOOL_DAYS.map((dayName) => {
      const templateSlots = buildTemplateDaySlots();
      const sourceDay = dayMap.get(dayName);
      if (!sourceDay) return { day: dayName, slots: templateSlots };

      const sourceByPeriod = new Map<number, TimetableSlot>();
      for (const slot of sourceDay.slots) {
        if (slot.type === "break" || slot.period == null) continue;
        sourceByPeriod.set(slot.period, slot);
      }

      const slots = templateSlots.map((templateSlot) => {
        if (templateSlot.type === "break") return templateSlot;
        return overlayTeachingSlot(templateSlot, sourceByPeriod.get(templateSlot.period!));
      });

      return { day: dayName, slots };
    }),
  };
}

export function countScheduleSlots(schedule: TimetableSchedule): number {
  return schedule.days.reduce((sum, day) => sum + day.slots.length, 0);
}
