/** Pure helpers for timetable vision requests (safe for QA fixtures). */

import { TIMETABLE_SCHOOL_DAYS, TIMETABLE_PERIOD_KEYS } from "@/lib/timetable/timetable-transcription";

export type TimetableImagePayloadInput = {
  mimeType: string;
  base64: string;
  fileName: string;
};

export function encodeImageBytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return globalThis.btoa(binary);
}

export function normalizeTimetableImageMimeType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return mimeType;
  return "image/jpeg";
}

const TRANSCRIPTION_LAYOUT_GUIDE = `ROWS: ${TIMETABLE_SCHOOL_DAYS.join(", ")}
COLUMNS: ${TIMETABLE_PERIOD_KEYS.map((k) => `Period ${k}`).join(", ")}
(Do not transcribe Break — the application inserts it after Period 4.)`;

export function buildTimetableTranscriptionVisionContent(
  input: TimetableImagePayloadInput,
): Array<
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail: "high" | "low" | "auto" | "original" }
> {
  const mimeType = normalizeTimetableImageMimeType(input.mimeType);
  return [
    {
      type: "input_text",
      text: `Transcribe the exact cell contents from this timetable image (${input.fileName}).

${TRANSCRIPTION_LAYOUT_GUIDE}

Return the 5×7 matrix only. For each cell:
- subject = visible abbreviation (ISL, QUR, …) or "" if empty
- text = visible class label exactly as printed or "" if empty
- null only when genuinely unreadable

Read each cell independently. Never shift content between columns.`,
    },
    {
      type: "input_image",
      image_url: `data:${mimeType};base64,${input.base64}`,
      detail: "high",
    },
  ];
}

/** @deprecated Use buildTimetableTranscriptionVisionContent */
export function buildTimetableVisionUserContent(
  input: TimetableImagePayloadInput,
): ReturnType<typeof buildTimetableTranscriptionVisionContent> {
  return buildTimetableTranscriptionVisionContent(input);
}

export function timetableVisionModel(): string {
  return (
    process.env.OPENAI_TIMETABLE_VISION_MODEL?.trim() ||
    process.env.OPENAI_VISION_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

export function timetableTextModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}
