import { supabase } from "@/integrations/supabase/client";

const BUCKET = "cms-uploads";
export const LESSON_FILES_BUCKET = "lesson-files";

export interface UploadedFile {
  url: string;
  name: string;
  size: string;
  path: string;
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Upload a File to Supabase Storage and return a long-lived signed URL. */
export async function uploadToStorage(file: File, folder = "files"): Promise<UploadedFile> {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitize(file.name)}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (up.error) throw new Error(`Upload failed: ${up.error.message}`);

  // Bucket is private (workspace policy); use a 10-year signed URL.
  const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, TEN_YEARS);
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(`Could not get file URL: ${signed.error?.message ?? "unknown"}`);
  }
  return { url: signed.data.signedUrl, name: file.name, size: humanSize(file.size), path };
}

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Upload a lesson attachment to the lesson-files bucket (admin only). */
export async function uploadLessonFile(file: File, folder: string): Promise<UploadedFile> {
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitize(file.name)}`;
  const up = await supabase.storage.from(LESSON_FILES_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (up.error) throw new Error(`Upload failed: ${up.error.message}`);

  const signed = await supabase.storage.from(LESSON_FILES_BUCKET).createSignedUrl(path, TEN_YEARS);
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(`Could not get file URL: ${signed.error?.message ?? "unknown"}`);
  }
  return { url: signed.data.signedUrl, name: file.name, size: humanSize(file.size), path };
}

/** Best-effort removal of a stored lesson file (admin only). */
export async function deleteLessonFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(LESSON_FILES_BUCKET).remove([storagePath]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/** Format any thrown value (Error / Supabase PostgrestError / object) into readable text. */
export function formatError(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  const obj = e as { message?: string; details?: string; code?: string; hint?: string };
  const parts: string[] = [];
  if (obj.message) parts.push(obj.message);
  if (obj.code) parts.push(`(code ${obj.code})`);
  if (obj.details) parts.push(`details: ${obj.details}`);
  if (obj.hint) parts.push(`hint: ${obj.hint}`);
  if (parts.length === 0) {
    try { return JSON.stringify(e); } catch { return String(e); }
  }
  return parts.join(" — ");
}
