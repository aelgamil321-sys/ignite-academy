import { z } from "zod";
import {
  deriveGradeSectionFromClassLabel,
  ensureFixedGridSchedule,
  TIMETABLE_GRID_COLUMNS,
  TIMETABLE_SCHOOL_DAYS,
  type TimetableSchoolDay,
} from "@/lib/timetable/timetable-grid";
import type { TimetableDay, TimetableSchedule, TimetableSlot } from "@/lib/timetable/timetable-types";
import { TIMETABLE_GRID_VERSION } from "@/lib/timetable/timetable-types";
import { normalizeTimetableSchedule } from "@/lib/timetable/timetable-weekday";

export { TIMETABLE_SCHOOL_DAYS, type TimetableSchoolDay };

export const TIMETABLE_PERIOD_KEYS = ["1", "2", "3", "4", "5", "6", "7"] as const;

export type TimetablePeriodKey = (typeof TIMETABLE_PERIOD_KEYS)[number];

export type TimetableTranscriptionCell = {
  subject: string | null;
  text: string | null;
};

export type TimetableDayTranscription = Record<TimetablePeriodKey, TimetableTranscriptionCell>;

export type TimetableTranscriptionMatrix = Record<TimetableSchoolDay, TimetableDayTranscription>;

const transcriptionCellSchema = z.object({
  subject: z.union([z.string(), z.null()]),
  text: z.union([z.string(), z.null()]),
});

const dayRowSchema = z.object({
  "1": transcriptionCellSchema,
  "2": transcriptionCellSchema,
  "3": transcriptionCellSchema,
  "4": transcriptionCellSchema,
  "5": transcriptionCellSchema,
  "6": transcriptionCellSchema,
  "7": transcriptionCellSchema,
});

/** AI returns ONLY this 5×7 transcription matrix — no times, periods, or slot types. */
export const aiTranscriptionMatrixSchema = z.object({
  Monday: dayRowSchema,
  Tuesday: dayRowSchema,
  Wednesday: dayRowSchema,
  Thursday: dayRowSchema,
  Friday: dayRowSchema,
});

export type AiTranscriptionMatrix = z.infer<typeof aiTranscriptionMatrixSchema>;

function periodColumn(period: number) {
  const col = TIMETABLE_GRID_COLUMNS.find((c) => c.period === period);
  if (!col || col.type !== "period") {
    throw new Error(`Missing period column ${period}`);
  }
  return col;
}

function breakColumn() {
  return TIMETABLE_GRID_COLUMNS.find((c) => c.type === "break")!;
}

function tc(subject: string, text: string): TimetableTranscriptionCell {
  return { subject, text };
}

function emptyTc(): TimetableTranscriptionCell {
  return { subject: "", text: "" };
}

/** Golden real timetable — AI transcription fixture (35 teaching cells). */
export const GOLDEN_TRANSCRIPTION_MATRIX: TimetableTranscriptionMatrix = {
  Monday: {
    "1": tc("ISL", "G11A/G11B"),
    "2": emptyTc(),
    "3": tc("ISL", "G9A/G9B"),
    "4": tc("ISL", "G11C/G11D"),
    "5": tc("ISL", "G12E/G12F"),
    "6": emptyTc(),
    "7": tc("ISL", "G12C/G12D"),
  },
  Tuesday: {
    "1": tc("ISL", "G12E/G12F"),
    "2": emptyTc(),
    "3": tc("ISL", "G9D/G9C"),
    "4": tc("ISL", "G10E/G10F"),
    "5": emptyTc(),
    "6": tc("ISL", "G9E/G9F"),
    "7": tc("ISL", "G9A/G9B"),
  },
  Wednesday: {
    "1": tc("ISL", "G11A/G11B"),
    "2": tc("QUR", "G8A"),
    "3": tc("ISL", "G11C/G11D"),
    "4": tc("ISL", "G10E/G10F"),
    "5": tc("ISL", "G11E/G11F"),
    "6": tc("ISL", "G10A/G10B"),
    "7": tc("ISL", "G12C/G12D"),
  },
  Thursday: {
    "1": tc("ISL", "G12A/G12B"),
    "2": tc("QUR", "G8A"),
    "3": tc("ISL", "G11E/G11F"),
    "4": tc("ISL", "G10C/G10D"),
    "5": tc("ISL", "G9D/G9C"),
    "6": tc("ISL", "G9E/G9F"),
    "7": tc("ISL", "G10A/G10B"),
  },
  Friday: {
    "1": tc("ISL", "G12A/G12B"),
    "2": tc("ISL", "G10C/G10D"),
    "3": emptyTc(),
    "4": emptyTc(),
    "5": emptyTc(),
    "6": emptyTc(),
    "7": emptyTc(),
  },
};

function isCellUnreadable(cell: TimetableTranscriptionCell): boolean {
  return cell.subject === null || cell.text === null;
}

function buildFreeSlot(period: number, needsReview: boolean): TimetableSlot {
  const col = periodColumn(period);
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
    confidence: needsReview ? 0 : 1,
    needsReview,
  };
}

function buildClassSlot(
  period: number,
  subject: string,
  classLabel: string,
  needsReview: boolean,
): TimetableSlot {
  const col = periodColumn(period);
  const derived = deriveGradeSectionFromClassLabel(classLabel);
  return {
    type: "class",
    period,
    startTime: col.startTime,
    endTime: col.endTime,
    subject,
    classLabel,
    grade: derived.grade,
    section: derived.section,
    room: "",
    notes: "",
    confidence: needsReview ? 0 : 1,
    needsReview,
  };
}

function buildBreakSlot(): TimetableSlot {
  const col = breakColumn();
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

function convertDayTranscription(
  day: TimetableSchoolDay,
  row: Partial<TimetableDayTranscription> | undefined,
): TimetableDay {
  const slots: TimetableSlot[] = [];

  for (const key of TIMETABLE_PERIOD_KEYS) {
    const period = Number(key);
    const cell = row?.[key] ?? emptyTc();

    if (isCellUnreadable(cell)) {
      slots.push(buildFreeSlot(period, true));
    } else if (!cell.text.trim()) {
      slots.push(buildFreeSlot(period, false));
    } else {
      const classLabel = cell.text.trim();
      const subject = (cell.subject ?? "").trim();
      const needsReview = !subject;
      slots.push(buildClassSlot(period, subject, classLabel, needsReview));
    }

    if (period === 4) {
      slots.push(buildBreakSlot());
    }
  }

  return { day, slots };
}

/** Fill missing days/cells with empty strings — missing defaults to free, not needsReview. */
export function normalizeTranscriptionMatrix(
  raw: Partial<TimetableTranscriptionMatrix>,
): TimetableTranscriptionMatrix {
  const matrix = {} as TimetableTranscriptionMatrix;
  for (const day of TIMETABLE_SCHOOL_DAYS) {
    const row = raw[day];
    matrix[day] = {} as TimetableDayTranscription;
    for (const key of TIMETABLE_PERIOD_KEYS) {
      const cell = row?.[key];
      matrix[day][key] = cell ?? emptyTc();
    }
  }
  return matrix;
}

/** Deterministic conversion: transcription matrix → ordered schedule slots. */
export function convertTranscriptionToSchedule(
  matrix: Partial<TimetableTranscriptionMatrix>,
): TimetableSchedule {
  const normalized = normalizeTranscriptionMatrix(matrix);
  return ensureFixedGridSchedule(
    normalizeTimetableSchedule({
      version: TIMETABLE_GRID_VERSION,
      days: TIMETABLE_SCHOOL_DAYS.map((day) => convertDayTranscription(day, normalized[day])),
    }),
  );
}

export const GOLDEN_SCHEDULE = convertTranscriptionToSchedule(GOLDEN_TRANSCRIPTION_MATRIX);

export type SlotComparisonResult = {
  total: number;
  correct: number;
  mismatches: Array<{ day: string; index: number; expected: TimetableSlot; actual: TimetableSlot }>;
};

export function compareScheduleSlots(
  actual: TimetableSchedule,
  expected: TimetableSchedule,
): SlotComparisonResult {
  const mismatches: SlotComparisonResult["mismatches"] = [];
  let total = 0;
  let correct = 0;

  for (const dayName of TIMETABLE_SCHOOL_DAYS) {
    const actualDay = actual.days.find((d) => d.day === dayName);
    const expectedDay = expected.days.find((d) => d.day === dayName);
    const actualSlots = actualDay?.slots ?? [];
    const expectedSlots = expectedDay?.slots ?? [];
    const len = Math.max(actualSlots.length, expectedSlots.length);

    for (let index = 0; index < len; index += 1) {
      total += 1;
      const exp = expectedSlots[index];
      const act = actualSlots[index];
      if (!exp || !act) {
        mismatches.push({
          day: dayName,
          index,
          expected: exp ?? ({} as TimetableSlot),
          actual: act ?? ({} as TimetableSlot),
        });
        continue;
      }
      const match =
        act.type === exp.type &&
        act.period === exp.period &&
        act.startTime === exp.startTime &&
        act.endTime === exp.endTime &&
        act.subject === exp.subject &&
        act.classLabel === exp.classLabel &&
        act.needsReview === exp.needsReview;
      if (match) {
        correct += 1;
      } else {
        mismatches.push({ day: dayName, index, expected: exp, actual: act });
      }
    }
  }

  return { total, correct, mismatches };
}

export const TIMETABLE_TRANSCRIPTION_SYSTEM_PROMPT = `You are transcribing a timetable grid, not interpreting it.

The row and column positions are supplied by the application.

ROWS (top to bottom): Monday, Tuesday, Wednesday, Thursday, Friday
COLUMNS (left to right): Period 1, Period 2, Period 3, Period 4, Period 5, Period 6, Period 7

Do NOT transcribe Break. Do NOT return start times, end times, period numbers, grade, section, free/break labels, or slot types.

For EVERY cell in the 5×7 matrix return:
- subject: abbreviation visible in the cell (e.g. ISL, QUR) or "" if the cell is empty
- text: class label exactly as printed (e.g. G11A/G11B, G8A) or "" if the cell is empty
- use null for subject or text ONLY if that field is genuinely unreadable

Read each cell independently.
An empty cell MUST remain empty (subject="", text="").
Never move content from one column to another.
Never collapse empty cells.
Never infer a class where no text is visible.
Preserve abbreviations and class labels exactly.
Return only the requested fixed matrix.`;
