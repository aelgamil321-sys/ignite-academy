import { supabase } from "@/integrations/supabase/client";
import {
  BILINGUAL_LESSON_FILE_SLOTS,
  type BilingualFileKey,
  type BilingualLessonPendingFiles,
} from "@/lib/lesson-bilingual-files";
import {
  buildLessonStorageKey,
  lessonStoragePathOwnedByLesson,
  parseLessonIdFromStoragePath,
  parseLessonUuid,
  resolveLessonFileContentType,
  validateLessonUploadFile,
  type LessonFileValidationMessage,
} from "@/lib/lesson-file-upload";

const BUCKET = "cms-uploads";
export const LESSON_FILES_BUCKET = "lesson-files";

export type { LessonFileValidationMessage };
export {
  buildLessonStorageKey,
  lessonStoragePathOwnedByLesson,
  parseLessonIdFromStoragePath,
  parseLessonUuid,
  resolveLessonFileContentType,
  validateLessonUploadFile,
} from "@/lib/lesson-file-upload";

/** Max signed URL lifetime when public URLs are unavailable (1 year). */
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24 * 365;

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
  if (!up.data) throw new Error("Upload failed: no upload data returned");

  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(`Could not get file URL: ${signed.error?.message ?? "unknown"}`);
  }
  return { url: signed.data.signedUrl, name: file.name, size: humanSize(file.size), path };
}

export type LessonFileUploadResult = {
  publicUrl: string;
  filePath: string;
  fileName: string;
};

/** Upload a lesson file to the lesson-files bucket and return its public URL. */
export async function uploadLessonFile(file: File, lessonId: string): Promise<LessonFileUploadResult> {
  const safeLessonId = parseLessonUuid(lessonId);
  if (!safeLessonId) {
    throw new Error(`Invalid lesson ID for upload: ${String(lessonId)}`);
  }

  const validation = validateLessonUploadFile(file);
  if (validation) {
    throw new Error(validation.en);
  }

  const filePath = buildLessonStorageKey(safeLessonId, file.name);
  const contentType = resolveLessonFileContentType(file) ?? undefined;

  console.log("[lesson upload] storage target", {
    bucket: LESSON_FILES_BUCKET,
    key: filePath,
    contentType,
    originalName: file.name,
    size: file.size,
    reportedType: file.type || null,
  });

  const { data, error } = await supabase.storage.from(LESSON_FILES_BUCKET).upload(filePath, file, {
    upsert: true,
    contentType,
    cacheControl: "3600",
  });

  console.log("[lesson upload] upload result", { bucket: LESSON_FILES_BUCKET, key: filePath, data, error });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(LESSON_FILES_BUCKET).getPublicUrl(filePath);

  return {
    publicUrl: publicUrlData.publicUrl,
    filePath,
    fileName: file.name,
  };
}

export type PendingLessonUploadResult = {
  urls: Partial<Record<BilingualFileKey, string>>;
  failures: Array<{ key: BilingualFileKey; message: string }>;
};

/** Upload all queued bilingual lesson files after the lesson row exists. */
export async function uploadPendingBilingualLessonFiles(
  lessonId: string,
  pending: BilingualLessonPendingFiles,
): Promise<PendingLessonUploadResult> {
  const urls: Partial<Record<BilingualFileKey, string>> = {};
  const failures: PendingLessonUploadResult["failures"] = [];

  for (const slot of BILINGUAL_LESSON_FILE_SLOTS) {
    const file = pending[slot.key];
    if (!file) continue;

    try {
      const { publicUrl } = await uploadLessonFile(file, lessonId);
      urls[slot.key] = publicUrl;
    } catch (err) {
      failures.push({ key: slot.key, message: formatError(err) });
    }
  }

  return { urls, failures };
}

/** Best-effort removal of a stored lesson file (admin only). */
export async function deleteLessonFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(LESSON_FILES_BUCKET).remove([storagePath]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/** Format any thrown value (Error / Supabase PostgrestError / object) into readable text. */
export function formatError(e: unknown): string {
  if (!e) return "Unknown error";
  if (e instanceof Error) return e.message;
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
