/**
 * Mirror of src/lib/timetable/timetable-transcription.ts for Node QA (no OpenAI).
 * Keep in sync with the TypeScript source.
 */

export const TIMETABLE_SCHOOL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const TIMETABLE_PERIOD_KEYS = ["1", "2", "3", "4", "5", "6", "7"];

export const TIMETABLE_GRID_COLUMNS = [
  { label: "Period 1", period: 1, startTime: "08:00", endTime: "08:50", type: "period" },
  { label: "Period 2", period: 2, startTime: "08:50", endTime: "09:40", type: "period" },
  { label: "Period 3", period: 3, startTime: "09:40", endTime: "10:30", type: "period" },
  { label: "Period 4", period: 4, startTime: "10:30", endTime: "11:20", type: "period" },
  { label: "BREAK", period: null, startTime: "11:20", endTime: "12:10", type: "break" },
  { label: "Period 5", period: 5, startTime: "12:10", endTime: "13:00", type: "period" },
  { label: "Period 6", period: 6, startTime: "13:00", endTime: "13:50", type: "period" },
  { label: "Period 7", period: 7, startTime: "13:50", endTime: "14:35", type: "period" },
];

function tc(subject, text) {
  return { subject, text };
}

function emptyTc() {
  return { subject: "", text: "" };
}

export const GOLDEN_TRANSCRIPTION_MATRIX = {
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

function periodColumn(period) {
  const col = TIMETABLE_GRID_COLUMNS.find((c) => c.period === period && c.type === "period");
  if (!col) throw new Error(`Missing period ${period}`);
  return col;
}

function breakColumn() {
  return TIMETABLE_GRID_COLUMNS.find((c) => c.type === "break");
}

function deriveGradeSectionFromClassLabel(classLabel) {
  const label = classLabel.trim();
  if (!label) return { grade: "", section: "" };
  const slashParts = label.split("/");
  if (slashParts.length === 2) {
    const left = slashParts[0].match(/^(G?\d+)([A-Z]+)$/i);
    const right = slashParts[1].match(/^(G?\d+)([A-Z]+)$/i);
    if (left && right) {
      const grade = left[1].toUpperCase().startsWith("G") ? left[1].toUpperCase() : `G${left[1]}`;
      const rightGrade = right[1].toUpperCase().startsWith("G") ? right[1].toUpperCase() : `G${right[1]}`;
      if (grade === rightGrade) {
        return { grade, section: `${left[2].toUpperCase()}/${right[2].toUpperCase()}` };
      }
    }
  }
  const single = label.match(/^(G?\d+)([A-Z]+)$/i);
  if (single) {
    const grade = single[1].toUpperCase().startsWith("G") ? single[1].toUpperCase() : `G${single[1]}`;
    return { grade, section: single[2].toUpperCase() };
  }
  return { grade: "", section: "" };
}

function isCellUnreadable(cell) {
  return cell.subject === null || cell.text === null;
}

function buildFreeSlot(period, needsReview) {
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

function buildClassSlot(period, subject, classLabel, needsReview) {
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

function buildBreakSlot() {
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

function convertDayTranscription(day, row) {
  const slots = [];
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
      slots.push(buildClassSlot(period, subject, classLabel, !subject));
    }
    if (period === 4) slots.push(buildBreakSlot());
  }
  return { day, slots };
}

export function normalizeTranscriptionMatrix(raw) {
  const matrix = {};
  for (const day of TIMETABLE_SCHOOL_DAYS) {
    matrix[day] = {};
    for (const key of TIMETABLE_PERIOD_KEYS) {
      matrix[day][key] = raw[day]?.[key] ?? emptyTc();
    }
  }
  return matrix;
}

function buildTemplateFreeSlot(period) {
  return buildFreeSlot(period, false);
}

function buildTemplateDaySlots() {
  const slots = [];
  for (const col of TIMETABLE_GRID_COLUMNS) {
    if (col.type === "break") slots.push(buildBreakSlot());
    else slots.push(buildTemplateFreeSlot(col.period));
  }
  return slots;
}

export function ensureFixedGridSchedule(schedule) {
  const templateDays = TIMETABLE_SCHOOL_DAYS.map((day) => ({ day, slots: buildTemplateDaySlots() }));
  if (!schedule?.days?.length) {
    return { version: 2, days: templateDays };
  }
  const dayMap = new Map();
  for (const day of schedule.days) {
    const key = TIMETABLE_SCHOOL_DAYS.find((d) => d.toLowerCase() === day.day.trim().toLowerCase());
    if (key) dayMap.set(key, day);
  }
  return {
    version: 2,
    days: TIMETABLE_SCHOOL_DAYS.map((dayName) => {
      const templateSlots = buildTemplateDaySlots();
      const sourceDay = dayMap.get(dayName);
      if (!sourceDay) return { day: dayName, slots: templateSlots };
      const sourceByPeriod = new Map();
      for (const slot of sourceDay.slots) {
        if (slot.type === "break" || slot.period == null) continue;
        sourceByPeriod.set(slot.period, slot);
      }
      const slots = templateSlots.map((templateSlot) => {
        if (templateSlot.type === "break") return templateSlot;
        const source = sourceByPeriod.get(templateSlot.period);
        if (!source || source.type === "free") {
          return source?.needsReview
            ? { ...templateSlot, needsReview: source.needsReview, confidence: source.confidence ?? 1 }
            : templateSlot;
        }
        if (source.type === "class") {
          const derived = deriveGradeSectionFromClassLabel(source.classLabel);
          return {
            ...templateSlot,
            type: "class",
            subject: source.subject,
            classLabel: source.classLabel,
            grade: source.grade || derived.grade,
            section: source.section || derived.section,
            needsReview: source.needsReview ?? false,
            confidence: source.confidence ?? 1,
          };
        }
        return templateSlot;
      });
      return { day: dayName, slots };
    }),
  };
}

export function convertTranscriptionToSchedule(matrix) {
  const normalized = normalizeTranscriptionMatrix(matrix);
  const schedule = {
    version: 2,
    days: TIMETABLE_SCHOOL_DAYS.map((day) => convertDayTranscription(day, normalized[day])),
  };
  return ensureFixedGridSchedule(schedule);
}

export function countScheduleSlots(schedule) {
  return schedule.days.reduce((sum, day) => sum + day.slots.length, 0);
}

export const GOLDEN_SCHEDULE = convertTranscriptionToSchedule(GOLDEN_TRANSCRIPTION_MATRIX);

export function compareScheduleSlots(actual, expected) {
  let total = 0;
  let correct = 0;
  const mismatches = [];
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
        mismatches.push({ day: dayName, index, expected: exp, actual: act });
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
      if (match) correct += 1;
      else mismatches.push({ day: dayName, index, expected: exp, actual: act });
    }
  }
  return { total, correct, mismatches };
}

export function daySlotsPass(actual, expectedDayName, expectedSchedule) {
  const actualDay = actual.days.find((d) => d.day === expectedDayName);
  const expectedDay = expectedSchedule.days.find((d) => d.day === expectedDayName);
  if (!actualDay || !expectedDay) return false;
  if (actualDay.slots.length !== expectedDay.slots.length) return false;
  return actualDay.slots.every((slot, i) => {
    const exp = expectedDay.slots[i];
    return (
      slot.type === exp.type &&
      slot.period === exp.period &&
      slot.startTime === exp.startTime &&
      slot.endTime === exp.endTime &&
      slot.subject === exp.subject &&
      slot.classLabel === exp.classLabel &&
      slot.needsReview === exp.needsReview
    );
  });
}
