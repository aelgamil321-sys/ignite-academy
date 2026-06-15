import { supabase } from "@/integrations/supabase/client";

export const ASSIGNMENT_FILES_BUCKET = "assignment-files";

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60;

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_SUBMISSION_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const ASSIGNMENT_ATTACHMENT_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,image/jpeg,image/png,image/webp,image/gif";

export const ASSIGNMENT_SUBMISSION_ACCEPT =
  ".pdf,.doc,.docx,image/jpeg,image/png,image/webp";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function validateAssignmentAttachment(file: File): string | null {
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return "Allowed: PDF, DOC/DOCX, PPT/PPTX, or image (JPEG, PNG, WebP, GIF).";
  }
  if (file.size > 20 * 1024 * 1024) {
    return "File must be 20 MB or smaller.";
  }
  return null;
}

export function validateAssignmentSubmissionFile(file: File): string | null {
  if (!ALLOWED_SUBMISSION_TYPES.has(file.type)) {
    return "Allowed: PDF, DOC/DOCX, or image (JPEG, PNG, WebP).";
  }
  if (file.size > 20 * 1024 * 1024) {
    return "File must be 20 MB or smaller.";
  }
  return null;
}

export async function uploadAssignmentAttachment(
  assignmentId: string,
  file: File,
): Promise<{ path: string; name: string; mime: string }> {
  const err = validateAssignmentAttachment(file);
  if (err) throw new Error(err);

  const path = `attachments/${assignmentId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
    cacheControl: "3600",
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return { path, name: file.name, mime: file.type };
}

export async function uploadAssignmentSubmissionFile(
  assignmentId: string,
  studentId: string,
  file: File,
): Promise<{ path: string; name: string; mime: string }> {
  const err = validateAssignmentSubmissionFile(file);
  if (err) throw new Error(err);

  const path = `submissions/${assignmentId}/${studentId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
    cacheControl: "3600",
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return { path, name: file.name, mime: file.type };
}

export async function getAssignmentFileSignedUrl(
  path: string | null | undefined,
): Promise<string | null> {
  const result = await requestAssignmentFileSignedUrl(path);
  return result.ok ? result.url : null;
}

export type AssignmentFileAccessError =
  | "missing_path"
  | "not_found"
  | "permission_denied"
  | "signed_url_failed";

export type AssignmentFileSignedUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: AssignmentFileAccessError; message: string };

function classifyStorageError(message: string): AssignmentFileAccessError {
  const lower = message.toLowerCase();
  if (lower.includes("not found") || lower.includes("object not found") || lower.includes("404")) {
    return "not_found";
  }
  if (
    lower.includes("permission") ||
    lower.includes("denied") ||
    lower.includes("unauthorized") ||
    lower.includes("403")
  ) {
    return "permission_denied";
  }
  return "signed_url_failed";
}

/** Request a short-lived signed URL for a private assignment file (on demand). */
export async function requestAssignmentFileSignedUrl(
  path: string | null | undefined,
): Promise<AssignmentFileSignedUrlResult> {
  const trimmed = path?.trim();
  if (!trimmed) {
    return { ok: false, error: "missing_path", message: "File path is missing." };
  }

  const { data, error } = await supabase.storage
    .from(ASSIGNMENT_FILES_BUCKET)
    .createSignedUrl(trimmed, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    const message = error?.message ?? "Could not create signed URL.";
    console.warn("[assignment file signed url]", message);
    return { ok: false, error: classifyStorageError(message), message };
  }

  return { ok: true, url: data.signedUrl };
}

export function inferMimeFromFileName(fileName: string): string | null {
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
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return null;
  }
}

export function resolveAssignmentFileMime(
  fileMime: string | null | undefined,
  fileName: string | null | undefined,
): string | null {
  const trimmed = fileMime?.trim();
  if (trimmed) return trimmed;
  if (fileName?.trim()) return inferMimeFromFileName(fileName.trim());
  return null;
}

export function isPdfMime(mime: string | null): boolean {
  return mime === "application/pdf";
}

export function isImageMime(mime: string | null): boolean {
  return !!mime && mime.startsWith("image/");
}

export function isPreviewableAssignmentFile(mime: string | null): boolean {
  return isPdfMime(mime) || isImageMime(mime);
}

export function formatAssignmentFileTypeLabel(
  mime: string | null,
  fileName: string | null,
  lang: "en" | "ar",
): string {
  if (isPdfMime(mime)) return lang === "ar" ? "PDF" : "PDF";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "DOCX";
  }
  if (mime === "application/msword") return "DOC";
  if (mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
    return "PPTX";
  }
  if (mime === "application/vnd.ms-powerpoint") return "PPT";
  if (isImageMime(mime)) return lang === "ar" ? "صورة" : "Image";
  const ext = fileName?.split(".").pop()?.toUpperCase();
  return ext || (lang === "ar" ? "ملف" : "File");
}

export function formatAssignmentFileSize(bytes: number | null | undefined, lang: "en" | "ar"): string {
  if (bytes == null || Number.isNaN(bytes)) return lang === "ar" ? "غير متاح" : "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Best-effort file size lookup from storage metadata (admin/student with access). */
export async function fetchAssignmentStorageFileMeta(
  path: string,
): Promise<{ size: number | null; error: string | null }> {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash < 0) return { size: null, error: null };

  const folder = path.slice(0, lastSlash);
  const fileName = path.slice(lastSlash + 1);
  const { data, error } = await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).list(folder, {
    limit: 100,
  });

  if (error) return { size: null, error: error.message };
  const match = data?.find((f) => f.name === fileName);
  if (!match) return { size: null, error: null };

  const meta = match.metadata as { size?: number } | undefined;
  const size = typeof meta?.size === "number" ? meta.size : null;
  return { size, error: null };
}

export async function deleteAssignmentStorageFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
