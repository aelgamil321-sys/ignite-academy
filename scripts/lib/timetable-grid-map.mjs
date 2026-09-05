/**
 * Mirror of src/lib/timetable/timetable-grid-map.server.ts for Node QA (no OpenAI).
 */

import { TIMETABLE_PERIOD_KEYS, TIMETABLE_SCHOOL_DAYS } from "./timetable-transcription.mjs";

const SUBJECT_CODES = new Set(["ISL", "QUR", "QURAN"]);

function emptyCell() {
  return { subject: "", text: "", confidence: 1 };
}

function cell(subject, text, confidence = 1) {
  return { subject, text, confidence };
}

function unreadableCell() {
  return { subject: null, text: null, confidence: 0 };
}

function normalizeSubjectCode(raw) {
  const upper = raw.trim().toUpperCase();
  if (upper === "QURAN") return "QUR";
  return upper;
}

export function parseTimetableCellContent(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return emptyCell();
  if (/^(free|empty|—|-)$/i.test(trimmed)) return emptyCell();

  const lines = trimmed
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const combined = lines.length > 1 ? lines.join(" ") : trimmed;

  const labeled = combined.match(/^(ISL|QUR|QURAN)\s*[:\-/]?\s*(.+)$/i);
  if (labeled) {
    const subject = normalizeSubjectCode(labeled[1]);
    const text = labeled[2].trim();
    if (!text) return unreadableCell();
    return cell(subject, text);
  }

  const codeOnly = combined.match(/^(ISL|QUR|QURAN)$/i);
  if (codeOnly) return unreadableCell();

  if (/^G\d/i.test(combined)) {
    return cell("ISL", combined);
  }

  return cell("", combined, 0.5);
}

function periodIndexFromHeader(value) {
  const token = value.trim().toLowerCase().replace(/\./g, "");
  const pMatch = token.match(/^p?([1-7])$/);
  if (pMatch) return pMatch[1];
  const periodMatch = token.match(/^period\s*([1-7])$/);
  if (periodMatch) return periodMatch[1];
  return null;
}

const DAY_ALIASES = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
};

function resolveDayName(value) {
  const token = value.trim().toLowerCase();
  return DAY_ALIASES[token] ?? null;
}

function emptyMatrix() {
  const matrix = {};
  for (const day of TIMETABLE_SCHOOL_DAYS) {
    matrix[day] = {};
    for (const key of TIMETABLE_PERIOD_KEYS) {
      matrix[day][key] = emptyCell();
    }
  }
  return matrix;
}

export function mapSpreadsheetGridToTranscriptionMatrix(rows) {
  if (!rows.length) return { ok: false, reason: "empty_grid" };

  let periodColumns = [];
  let headerRow = -1;

  for (let r = 0; r < Math.min(rows.length, 8); r += 1) {
    const row = rows[r] ?? [];
    const cols = [];
    for (let c = 0; c < row.length; c += 1) {
      const key = periodIndexFromHeader(String(row[c] ?? ""));
      if (key) cols.push({ index: c, key });
    }
    if (cols.length >= 5) {
      periodColumns = cols.slice(0, 7);
      headerRow = r;
      break;
    }
  }

  if (periodColumns.length < 5) {
    const fallback = [];
    for (let i = 0; i < TIMETABLE_PERIOD_KEYS.length; i += 1) {
      fallback.push({ index: i + 1, key: TIMETABLE_PERIOD_KEYS[i] });
    }
    periodColumns = fallback;
    headerRow = -1;
  }

  const matrix = emptyMatrix();
  let mappedDays = 0;

  for (let r = headerRow + 1; r < rows.length; r += 1) {
    const row = rows[r] ?? [];
    if (!row.some((cell) => String(cell ?? "").trim())) continue;

    let dayName = null;
    let dayCol = 0;
    for (let c = 0; c < Math.min(row.length, 3); c += 1) {
      dayName = resolveDayName(String(row[c] ?? ""));
      if (dayName) {
        dayCol = c;
        break;
      }
    }
    if (!dayName) continue;

    mappedDays += 1;
    for (const col of periodColumns) {
      const raw = String(row[col.index] ?? "").trim();
      if (col.index === dayCol && resolveDayName(raw)) continue;
      matrix[dayName][col.key] = parseTimetableCellContent(raw);
    }
  }

  if (mappedDays < 5) {
    return { ok: false, reason: "insufficient_day_rows" };
  }

  return { ok: true, matrix, method: "xlsx_grid" };
}

export function mapTimetableTextToTranscriptionMatrix(text) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split("\t"))
    .filter((row) => row.some((cell) => cell.trim()));
  if (rows.length >= 5) {
    const gridResult = mapSpreadsheetGridToTranscriptionMatrix(rows);
    if (gridResult.ok) {
      return { ...gridResult, method: "text_grid" };
    }
  }
  return { ok: false, reason: "text_not_grid_shaped" };
}

export function matrixPreservesSubjectCodes(matrix) {
  for (const day of TIMETABLE_SCHOOL_DAYS) {
    for (const key of TIMETABLE_PERIOD_KEYS) {
      const subject = matrix[day][key].subject;
      if (subject == null || subject === "") continue;
      if (!SUBJECT_CODES.has(normalizeSubjectCode(subject))) return false;
    }
  }
  return true;
}

export function buildGoldenSpreadsheetRows(goldenMatrix) {
  const header = ["Day", "P1", "P2", "P3", "P4", "P5", "P6", "P7"];
  const fmt = (subject, text) => {
    if (!text) return "";
    return `${subject} ${text}`.trim();
  };
  const rows = [header];
  for (const day of TIMETABLE_SCHOOL_DAYS) {
    const dayRow = goldenMatrix[day];
    rows.push([
      day,
      fmt(dayRow["1"].subject, dayRow["1"].text),
      fmt(dayRow["2"].subject, dayRow["2"].text),
      fmt(dayRow["3"].subject, dayRow["3"].text),
      fmt(dayRow["4"].subject, dayRow["4"].text),
      fmt(dayRow["5"].subject, dayRow["5"].text),
      fmt(dayRow["6"].subject, dayRow["6"].text),
      fmt(dayRow["7"].subject, dayRow["7"].text),
    ]);
  }
  return rows;
}
