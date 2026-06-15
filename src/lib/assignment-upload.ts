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
  const trimmed = path?.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase.storage
    .from(ASSIGNMENT_FILES_BUCKET)
    .createSignedUrl(trimmed, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn("[assignment file signed url]", error?.message ?? "missing url");
    return null;
  }
  return data.signedUrl;
}

export async function deleteAssignmentStorageFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(ASSIGNMENT_FILES_BUCKET).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
