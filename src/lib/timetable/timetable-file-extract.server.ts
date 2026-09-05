import JSZip from "jszip";
import {
  encodeImageBytesToBase64,
  normalizeTimetableImageMimeType,
} from "@/lib/timetable/timetable-vision-request";
import {
  extractLessonFileText,
  extractPdfText,
  extractPptxText,
  inferLessonFileType,
  trimExtractedText,
} from "@/lib/ai/lesson-file-extract.server";

export type TimetableFileKind =
  | "pdf"
  | "image"
  | "xlsx"
  | "xls"
  | "pptx"
  | "ppt"
  | "unknown";

const IMAGE_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export function inferTimetableFileKind(
  fileName: string,
  mimeType: string,
): TimetableFileKind {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".xlsx") || mimeType.includes("spreadsheetml")) return "xlsx";
  if (lower.endsWith(".xls") || mimeType === "application/vnd.ms-excel") return "xls";
  if (lower.endsWith(".pptx") || mimeType.includes("presentationml")) return "pptx";
  if (lower.endsWith(".ppt")) return "ppt";
  if (IMAGE_MIME.has(mimeType) || /\.(jpe?g|png|webp)$/i.test(lower)) return "image";
  const lessonType = inferLessonFileType(fileName);
  if (lessonType === "pdf" || mimeType === "application/pdf") return "pdf";
  return "unknown";
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function readXlsxSharedStrings(zip: JSZip): Promise<string[]> {
  const xml = await zip.file("xl/sharedStrings.xml")?.async("text");
  if (!xml) return [];
  const strings: string[] = [];
  for (const match of xml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    const chunk = match[1] ?? "";
    const parts = [...chunk.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => m[1] ?? "");
    strings.push(decodeXmlEntities(parts.join("")));
  }
  return strings;
}

function columnLettersToIndex(letters: string): number {
  let index = 0;
  for (const ch of letters) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index - 1;
}

async function readXlsxSheetRows(zip: JSZip, sharedStrings: string[]): Promise<string[][]> {
  const sheetPath =
    (await zip.file("xl/worksheets/sheet1.xml")) ? "xl/worksheets/sheet1.xml" : null;
  if (!sheetPath) return [];
  const xml = await zip.file(sheetPath)?.async("text");
  if (!xml) return [];

  const rowMap = new Map<number, Map<number, string>>();
  for (const rowMatch of xml.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const rowNum = Number(rowMatch[1]);
    const rowXml = rowMatch[2] ?? "";
    const cells = new Map<number, string>();
    for (const cellMatch of rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1] ?? "";
      const ref = attrs.match(/\br="([A-Z]+)(\d+)"/)?.[1];
      if (!ref) continue;
      const col = columnLettersToIndex(ref);
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const rawValue = cellMatch[2]?.match(/<v>([^<]*)<\/v>/)?.[1] ?? "";
      let value = rawValue;
      if (type === "s") {
        const idx = Number(rawValue);
        value = sharedStrings[idx] ?? "";
      } else if (type === "inlineStr") {
        value = decodeXmlEntities(
          cellMatch[2]?.match(/<t[^>]*>([^<]*)<\/t>/)?.[1] ?? "",
        );
      }
      cells.set(col, decodeXmlEntities(value.trim()));
    }
    if (cells.size > 0) rowMap.set(rowNum, cells);
  }

  const maxRow = Math.max(0, ...rowMap.keys());
  const maxCol = Math.max(0, ...[...rowMap.values()].flatMap((m) => [...m.keys()]));
  const rows: string[][] = [];
  for (let r = 1; r <= maxRow; r += 1) {
    const cells = rowMap.get(r);
    if (!cells) continue;
    const row: string[] = [];
    for (let c = 0; c <= maxCol; c += 1) {
      row.push(cells.get(c) ?? "");
    }
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  return rows;
}

export async function extractXlsxGrid(bytes: Uint8Array): Promise<string[][]> {
  const zip = await JSZip.loadAsync(bytes);
  const sharedStrings = await readXlsxSharedStrings(zip);
  return readXlsxSheetRows(zip, sharedStrings);
}

export function xlsxGridToText(rows: string[][]): string {
  return rows.map((row) => row.join("\t")).join("\n");
}

export type TimetableExtractedContent =
  | { mode: "text"; text: string; hint?: string }
  | { mode: "image"; mimeType: string; base64: string; hint?: string };

export type TimetableExtractFileErrorCode =
  | "unsupported_file"
  | "unreadable_timetable"
  | "file_parsing_failed";

export async function extractTimetableFileContent(
  bytes: Uint8Array,
  fileName: string,
  mimeType: string,
): Promise<{
  content: TimetableExtractedContent | null;
  error?: string;
  errorCode?: TimetableExtractFileErrorCode;
}> {
  const kind = inferTimetableFileKind(fileName, mimeType);

  if (kind === "image") {
    const normalizedMime = normalizeTimetableImageMimeType(mimeType);
    const base64 = encodeImageBytesToBase64(bytes);
    return { content: { mode: "image", mimeType: normalizedMime, base64 } };
  }

  if (kind === "xlsx") {
    try {
      const rows = await extractXlsxGrid(bytes);
      const text = trimExtractedText(xlsxGridToText(rows), 80_000);
      if (!text) {
        return {
          content: null,
          error: "No readable cells found in spreadsheet.",
          errorCode: "unreadable_timetable",
        };
      }
      return {
        content: {
          mode: "text",
          text,
          hint: "Spreadsheet grid extracted deterministically. Normalize into weekly periods.",
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Spreadsheet extraction failed";
      return { content: null, error: message, errorCode: "file_parsing_failed" };
    }
  }

  if (kind === "pdf") {
    try {
      const text = trimExtractedText(await extractPdfText(bytes), 80_000);
      if (!text) {
        return {
          content: null,
          error: "No readable text found in PDF.",
          errorCode: "unreadable_timetable",
        };
      }
      return { content: { mode: "text", text } };
    } catch (err) {
      const message = err instanceof Error ? err.message : "PDF extraction failed";
      return { content: null, error: message, errorCode: "file_parsing_failed" };
    }
  }

  if (kind === "pptx" || kind === "ppt") {
    const lessonType = kind === "pptx" ? "pptx" : "ppt";
    const result = await extractLessonFileText(bytes, lessonType);
    if (result.error && !result.text) {
      return { content: null, error: result.error, errorCode: "file_parsing_failed" };
    }
    const text = trimExtractedText(result.text, 80_000);
    if (!text) {
      return {
        content: null,
        error: result.error ?? "No readable slide text found.",
        errorCode: "unreadable_timetable",
      };
    }
    return {
      content: {
        mode: "text",
        text,
        hint: "Presentation text extracted. Normalize timetable rows from slides.",
      },
    };
  }

  if (kind === "xls") {
    return {
      content: null,
      error:
        "Legacy .xls files are not parsed deterministically. Please upload .xlsx or a PDF/image timetable.",
      errorCode: "unsupported_file",
    };
  }

  return { content: null, error: "Unsupported timetable file type.", errorCode: "unsupported_file" };
}
