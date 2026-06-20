/** Lesson bilingual file upload helpers (lesson-files bucket). */

export const LESSON_FILE_MAX_BYTES = 104_857_600; // 100 MB — matches storage.buckets.file_size_limit

export const LESSON_FILE_ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export type LessonFileValidationMessage = {
  en: string;
  ar: string;
};

export function sanitizeLessonStorageFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  const ascii = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+/, "");
  return (ascii.slice(0, 180) || "file").toLowerCase();
}

export function inferLessonFileMimeFromName(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    default:
      return null;
  }
}

/** Browsers often report PPTX/DOCX as application/zip — resolve from extension instead. */
export function resolveLessonFileContentType(file: File): string | null {
  const fromName = inferLessonFileMimeFromName(file.name);
  const fromFile = file.type?.trim() ?? "";
  if (
    fromFile &&
    fromFile !== "application/zip" &&
    fromFile !== "application/x-zip-compressed" &&
    fromFile !== "application/octet-stream"
  ) {
    return fromFile;
  }
  return fromName;
}

export function validateLessonUploadFile(file: File): LessonFileValidationMessage | null {
  const mime = resolveLessonFileContentType(file);
  if (!mime || !LESSON_FILE_ALLOWED_MIME_TYPES.has(mime)) {
    return {
      en: "Unsupported file type. Allowed: PDF, DOC/DOCX, PPT/PPTX.",
      ar: "نوع الملف غير مدعوم. المسموح: PDF و DOC/DOCX و PPT/PPTX.",
    };
  }
  if (file.size > LESSON_FILE_MAX_BYTES) {
    return {
      en: "File size must be 100 MB or less.",
      ar: "يجب أن يكون حجم الملف 100 ميجابايت أو أقل.",
    };
  }
  return null;
}

export function buildLessonStorageKey(lessonId: string, originalFileName: string): string {
  const safeLessonId = lessonId.trim().replace(/[^a-zA-Z0-9-]/g, "");
  const safeName = sanitizeLessonStorageFileName(originalFileName);
  return `lessons/${safeLessonId}/${Date.now()}-${safeName}`;
}
