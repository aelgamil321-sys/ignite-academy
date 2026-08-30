import type { CustomLesson } from "@/lib/cms";
import type { Lang } from "@/lib/i18n-config";
import {
  BILINGUAL_FILE_DB_COLUMN,
  type BilingualFileKey,
  type BilingualLessonFiles,
  fileNameFromUrl,
} from "@/lib/lesson-bilingual-files";
import {
  inferLessonFileMimeFromName,
  lessonStoragePathOwnedByLesson,
  parseLessonIdFromStoragePath,
  resolveLessonFileContentType,
  type LessonFileValidationMessage,
} from "@/lib/lesson-file-upload";

export const MAIN_LESSON_FILE_ACCEPT =
  ".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";

/** Create-lesson flow: PDF/PPTX only (AI extraction does not support legacy .ppt). */
export const CREATE_MAIN_LESSON_FILE_ACCEPT =
  ".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation";

export function validateLessonMainFileForCreate(file: File): LessonFileValidationMessage | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "ppt") {
    return {
      en: "Legacy .ppt is not supported for AI lesson generation. Please upload PDF or .pptx.",
      ar: "ملفات .ppt القديمة غير مدعومة لتوليد الدروس بالذكاء الاصطناعي. يُرجى رفع PDF أو .pptx.",
    };
  }
  const mime = resolveLessonFileContentType(file);
  const allowed = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]);
  if (!mime || !allowed.has(mime)) {
    return {
      en: "Unsupported file type. Allowed: PDF or PPTX.",
      ar: "نوع الملف غير مدعوم. المسموح: PDF أو PPTX.",
    };
  }
  if (file.size > 104_857_600) {
    return {
      en: "File size must be 100 MB or less.",
      ar: "يجب أن يكون حجم الملف 100 ميجابايت أو أقل.",
    };
  }
  return null;
}

const MAIN_BILINGUAL_KEYS: BilingualFileKey[] = [
  "pptArUrl",
  "pptEnUrl",
  "pdfArUrl",
  "pdfEnUrl",
];

export type MainLessonFileRef =
  | { kind: "bilingual"; key: BilingualFileKey; url: string; fileName: string }
  | { kind: "legacy-ppt"; url: string; fileName: string }
  | { kind: "legacy-pdf"; url: string; fileName: string };

export function validateLessonMainFileUpload(file: File): LessonFileValidationMessage | null {
  const mime = resolveLessonFileContentType(file);
  const allowed = new Set([
    "application/pdf",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ]);
  if (!mime || !allowed.has(mime)) {
    return {
      en: "Unsupported file type. Allowed: PDF, PPT, PPTX.",
      ar: "نوع الملف غير مدعوم. المسموح: PDF و PPT و PPTX.",
    };
  }
  if (file.size > 104_857_600) {
    return {
      en: "File size must be 100 MB or less.",
      ar: "يجب أن يكون حجم الملف 100 ميجابايت أو أقل.",
    };
  }
  return null;
}

export function mainFileSlotForUpload(lang: Lang, file: File): BilingualFileKey {
  const mime = resolveLessonFileContentType(file);
  const isPdf = mime === "application/pdf" || inferLessonFileMimeFromName(file.name) === "application/pdf";
  if (isPdf) return lang === "ar" ? "pdfArUrl" : "pdfEnUrl";
  return lang === "ar" ? "pptArUrl" : "pptEnUrl";
}

export function resolveMainLessonFile(
  files: BilingualLessonFiles,
  lesson?: Pick<CustomLesson, "pptUrl" | "pptName" | "pdfUrl" | "pdfName">,
  lang?: Lang,
): MainLessonFileRef | null {
  const langFirst: BilingualFileKey[] =
    lang === "ar"
      ? ["pptArUrl", "pdfArUrl", "pptEnUrl", "pdfEnUrl"]
      : ["pptEnUrl", "pdfEnUrl", "pptArUrl", "pdfArUrl"];

  for (const key of langFirst) {
    const url = files[key]?.trim();
    if (url) {
      return { kind: "bilingual", key, url, fileName: fileNameFromUrl(url) };
    }
  }

  const ppt = lesson?.pptUrl?.trim();
  if (ppt) {
    return {
      kind: "legacy-ppt",
      url: ppt,
      fileName: lesson?.pptName?.trim() || fileNameFromUrl(ppt),
    };
  }

  const pdf = lesson?.pdfUrl?.trim();
  if (pdf) {
    return {
      kind: "legacy-pdf",
      url: pdf,
      fileName: lesson?.pdfName?.trim() || fileNameFromUrl(pdf),
    };
  }

  return null;
}

export function hasMainLessonFile(
  files: BilingualLessonFiles,
  lesson?: Pick<CustomLesson, "pptUrl" | "pdfUrl">,
): boolean {
  return resolveMainLessonFile(files, lesson) != null;
}

export function mainFileDbColumn(key: BilingualFileKey): string {
  return BILINGUAL_FILE_DB_COLUMN[key];
}

export function isMainLessonBilingualKey(key: BilingualFileKey): boolean {
  return MAIN_BILINGUAL_KEYS.includes(key);
}

/** Extract Supabase storage object path from a lesson-files public URL. */
export function storagePathFromLessonFileUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const markers = ["/lesson-files/", "/object/public/lesson-files/", "/object/sign/lesson-files/"];
    for (const marker of markers) {
      const idx = pathname.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(pathname.slice(idx + marker.length));
      }
    }
    return null;
  } catch {
    return null;
  }
}

export { parseLessonIdFromStoragePath, lessonStoragePathOwnedByLesson };

export function inferMainFileType(fileName: string): "pdf" | "pptx" | "ppt" | null {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".pptx")) return "pptx";
  if (lower.endsWith(".ppt")) return "ppt";
  return null;
}
