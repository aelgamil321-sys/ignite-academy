import {
  TIMETABLE_PERIOD_KEYS,
  TIMETABLE_SCHOOL_DAYS,
  type TimetableDayTranscription,
  type TimetablePeriodKey,
  type TimetableTranscriptionCell,
  type TimetableTranscriptionMatrix,
} from "@/lib/timetable/timetable-transcription";
import { canonicalDayName, dayOfWeekFromName } from "@/lib/timetable/timetable-weekday";

export type GridMapResult =
  | { ok: true; matrix: TimetableTranscriptionMatrix; method: "xlsx_grid" | "text_grid" }
  | { ok: false; reason: string };

const SUBJECT_CODES = new Set(["ISL", "QUR", "QURAN"]);

function emptyCell(): TimetableTranscriptionCell {
  return { subject: "", text: "", confidence: 1 };
}

function cell(subject: string, text: string, confidence = 1): TimetableTranscriptionCell {
  return { subject, text, confidence };
}

function unreadableCell(): TimetableTranscriptionCell {
  return { subject: null, text: null, confidence: 0 };
}

function normalizeSubjectCode(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (upper === "QURAN") return "QUR";
  return upper;
}

/** Parse one timetable cell string into subject + class label. */
export function parseTimetableCellContent(raw: string): TimetableTranscriptionCell {
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
    const subject = normalizeSubjectCode(labeled[1]!);
    const text = labeled[2]!.trim();
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

function isPeriodHeader(value: string): boolean {
  const token = value.trim().toLowerCase().replace(/\./g, "");
  if (/^p[1-7]$/.test(token)) return true;
  if (/^period\s*[1-7]$/.test(token)) return true;
  return TIMETABLE_PERIOD_KEYS.includes(token as TimetablePeriodKey);
}

function periodIndexFromHeader(value: string): TimetablePeriodKey | null {
  const token = value.trim().toLowerCase().replace(/\./g, "");
  const pMatch = token.match(/^p?([1-7])$/);
  if (pMatch) return pMatch[1] as TimetablePeriodKey;
  const periodMatch = token.match(/^period\s*([1-7])$/);
  if (periodMatch) return periodMatch[1] as TimetablePeriodKey;
  return null;
}

function resolveDayName(value: string): (typeof TIMETABLE_SCHOOL_DAYS)[number] | null {
  const dow = dayOfWeekFromName(value);
  if (dow == null) return null;
  const canonical = canonicalDayName(value);
  return TIMETABLE_SCHOOL_DAYS.includes(canonical as (typeof TIMETABLE_SCHOOL_DAYS)[number])
    ? (canonical as (typeof TIMETABLE_SCHOOL_DAYS)[number])
    : null;
}

function emptyMatrix(): TimetableTranscriptionMatrix {
  const matrix = {} as TimetableTranscriptionMatrix;
  for (const day of TIMETABLE_SCHOOL_DAYS) {
    matrix[day] = {} as TimetableDayTranscription;
    for (const key of TIMETABLE_PERIOD_KEYS) {
      matrix[day][key] = emptyCell();
    }
  }
  return matrix;
}

/**
 * Map a spreadsheet-style grid (rows × columns) to the 5×7 transcription matrix.
 * Expects day names in the first column and period columns P1–P7 (or Period 1–7).
 */
export function mapSpreadsheetGridToTranscriptionMatrix(rows: string[][]): GridMapResult {
  if (!rows.length) return { ok: false, reason: "empty_grid" };

  let periodColumns: Array<{ index: number; key: TimetablePeriodKey }> = [];
  let headerRow = -1;

  for (let r = 0; r < Math.min(rows.length, 8); r += 1) {
    const row = rows[r] ?? [];
    const cols: Array<{ index: number; key: TimetablePeriodKey }> = [];
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
    const fallback: Array<{ index: number; key: TimetablePeriodKey }> = [];
    for (let i = 0; i < TIMETABLE_PERIOD_KEYS.length; i += 1) {
      fallback.push({ index: i + 1, key: TIMETABLE_PERIOD_KEYS[i]! });
    }
    periodColumns = fallback;
    headerRow = -1;
  }

  const matrix = emptyMatrix();
  let mappedDays = 0;

  for (let r = headerRow + 1; r < rows.length; r += 1) {
    const row = rows[r] ?? [];
    if (!row.some((cell) => String(cell ?? "").trim())) continue;

    let dayName: (typeof TIMETABLE_SCHOOL_DAYS)[number] | null = null;
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

/** Attempt to map tab-separated / line-based timetable text without AI. */
export function mapTimetableTextToTranscriptionMatrix(text: string): GridMapResult {
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

/** QA helper — verify subject codes were not rewritten. */
export function matrixPreservesSubjectCodes(matrix: TimetableTranscriptionMatrix): boolean {
  for (const day of TIMETABLE_SCHOOL_DAYS) {
    for (const key of TIMETABLE_PERIOD_KEYS) {
      const subject = matrix[day][key].subject;
      if (subject == null || subject === "") continue;
      if (!SUBJECT_CODES.has(normalizeSubjectCode(subject))) return false;
    }
  }
  return true;
}
