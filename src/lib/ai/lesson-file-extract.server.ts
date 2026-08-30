import JSZip from "jszip";
import { extractText, getDocumentProxy } from "unpdf";
import type { LessonFileType } from "@/lib/ai/lesson-generation-types";
import { LESSON_AI_MAX_EXTRACTED_CHARS } from "@/lib/ai/lesson-generation-types";

const OLE_PPT_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

export function inferLessonFileType(fileName: string): LessonFileType | null {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".pptx")) return "pptx";
  if (lower.endsWith(".ppt")) return "ppt";
  return null;
}

export function isLegacyPptBinary(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return OLE_PPT_MAGIC.every((b, i) => bytes[i] === b);
}

export function trimExtractedText(text: string, maxChars = LESSON_AI_MAX_EXTRACTED_CHARS): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}\n\n[Text truncated for AI processing]`;
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  return pages
    .map((pageText, index) => `Page ${index + 1}:\n${String(pageText ?? "").trim()}`)
    .filter((block) => block.trim().length > 8)
    .join("\n\n");
}

export async function extractPptxText(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)/i)?.[1] ?? 0);
      return na - nb;
    });

  const slides: string[] = [];
  for (const name of slideNames) {
    const xml = await zip.file(name)?.async("text");
    if (!xml) continue;
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)]
      .map((match) => match[1]?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim())
      .filter(Boolean);
    if (texts.length > 0) {
      slides.push(`Slide ${slides.length + 1}:\n${texts.join(" ")}`);
    }
  }

  return slides.join("\n\n");
}

export async function extractLessonFileText(
  bytes: Uint8Array,
  fileType: LessonFileType,
): Promise<{ text: string; error?: string }> {
  if (fileType === "ppt" || isLegacyPptBinary(bytes)) {
    return {
      text: "",
      error:
        "Legacy .ppt files cannot be parsed on the server. Please upload PDF or save the presentation as .pptx.",
    };
  }

  try {
    const raw =
      fileType === "pdf"
        ? await extractPdfText(bytes)
        : await extractPptxText(bytes);

    const trimmed = trimExtractedText(raw);
    if (!trimmed) {
      return { text: "", error: "No readable text could be extracted from this file." };
    }
    return { text: trimmed };
  } catch (err) {
    const message = err instanceof Error ? err.message : "File extraction failed";
    return { text: "", error: message };
  }
}
