import { extractTimetableWithAi } from "@/lib/timetable/extract-timetable.server";
import {
  extractTimetableFileContent,
  extractXlsxGrid,
  inferTimetableFileKind,
  type TimetableFileKind,
} from "@/lib/timetable/timetable-file-extract.server";
import {
  mapSpreadsheetGridToTranscriptionMatrix,
  mapTimetableTextToTranscriptionMatrix,
  matrixPreservesSubjectCodes,
} from "@/lib/timetable/timetable-grid-map.server";
import { convertTranscriptionToSchedule } from "@/lib/timetable/timetable-transcription";
import type { TimetableSchedule } from "@/lib/timetable/timetable-types";
import { scheduleHasNeedsReview } from "@/lib/timetable/timetable-weekday";
import { ensureFixedGridSchedule } from "@/lib/timetable/timetable-grid";

export type TimetableExtractErrorCode =
  | "unsupported_file"
  | "unreadable_timetable"
  | "file_parsing_failed"
  | "ai_disabled"
  | "ai_temporarily_unavailable"
  | "download_failed"
  | "auth_required"
  | "no_timetable_file"
  | "forbidden"
  | "load_failed"
  | "server_misconfigured";

export type ExtractTeacherTimetableResult =
  | {
      ok: true;
      schedule: TimetableSchedule;
      needsReview: boolean;
      method: "xlsx_grid" | "text_grid" | "ai_vision" | "ai_text";
    }
  | { ok: false; errorCode: TimetableExtractErrorCode };

function mapAiErrorCode(
  code: "ai_disabled" | "provider_error" | "invalid_output" | "timeout" | "rate_limit" | "network",
): TimetableExtractErrorCode {
  if (code === "ai_disabled") return "ai_disabled";
  if (code === "rate_limit" || code === "timeout" || code === "network") {
    return "ai_temporarily_unavailable";
  }
  return "unreadable_timetable";
}

function tryDeterministicFromGrid(rows: string[][]): ExtractTeacherTimetableResult | null {
  const mapped = mapSpreadsheetGridToTranscriptionMatrix(rows);
  if (!mapped.ok) return null;
  if (!matrixPreservesSubjectCodes(mapped.matrix)) return null;
  const schedule = ensureFixedGridSchedule(convertTranscriptionToSchedule(mapped.matrix));
  return {
    ok: true,
    schedule,
    needsReview: scheduleHasNeedsReview(schedule),
    method: mapped.method,
  };
}

function tryDeterministicFromText(text: string): ExtractTeacherTimetableResult | null {
  const mapped = mapTimetableTextToTranscriptionMatrix(text);
  if (!mapped.ok) return null;
  if (!matrixPreservesSubjectCodes(mapped.matrix)) return null;
  const schedule = ensureFixedGridSchedule(convertTranscriptionToSchedule(mapped.matrix));
  return {
    ok: true,
    schedule,
    needsReview: scheduleHasNeedsReview(schedule),
    method: mapped.method,
  };
}

export async function runTeacherTimetableExtraction(input: {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  teacherId: string;
}): Promise<ExtractTeacherTimetableResult> {
  const kind = inferTimetableFileKind(input.fileName, input.mimeType);

  if (kind === "xls" || kind === "ppt" || kind === "unknown") {
    return { ok: false, errorCode: "unsupported_file" };
  }

  if (kind === "xlsx") {
    try {
      const rows = await extractXlsxGrid(input.bytes);
      const deterministic = tryDeterministicFromGrid(rows);
      if (deterministic) return deterministic;
    } catch {
      return { ok: false, errorCode: "file_parsing_failed" };
    }
  }

  const extracted = await extractTimetableFileContent(
    input.bytes,
    input.fileName,
    input.mimeType,
  );
  if (!extracted.content) {
    const code: TimetableExtractErrorCode =
      extracted.errorCode ??
      (kind === "pdf" ? "unreadable_timetable" : "file_parsing_failed");
    return { ok: false, errorCode: code };
  }

  if (extracted.content.mode === "text") {
    const deterministic = tryDeterministicFromText(extracted.content.text);
    if (deterministic) return deterministic;
  }

  if (extracted.content.mode === "text" && kind !== "image") {
    const ai = await extractTimetableWithAi({
      content: extracted.content,
      fileName: input.fileName,
      teacherId: input.teacherId,
    });
    if (!ai.ok) {
      return { ok: false, errorCode: mapAiErrorCode(ai.errorCode) };
    }
    const schedule = ensureFixedGridSchedule(ai.schedule);
    return {
      ok: true,
      schedule,
      needsReview: scheduleHasNeedsReview(schedule),
      method: "ai_text",
    };
  }

  if (extracted.content.mode === "image") {
    const ai = await extractTimetableWithAi({
      content: extracted.content,
      fileName: input.fileName,
      teacherId: input.teacherId,
    });
    if (!ai.ok) {
      return { ok: false, errorCode: mapAiErrorCode(ai.errorCode) };
    }
    const schedule = ensureFixedGridSchedule(ai.schedule);
    return {
      ok: true,
      schedule,
      needsReview: scheduleHasNeedsReview(schedule),
      method: "ai_vision",
    };
  }

  return { ok: false, errorCode: "unreadable_timetable" };
}

export function extractionKindLabel(kind: TimetableFileKind): string {
  return kind;
}
