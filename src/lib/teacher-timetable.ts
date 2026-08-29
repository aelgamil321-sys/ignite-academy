import { supabase } from "@/integrations/supabase/client";

export const TEACHER_TIMETABLES_BUCKET = "teacher-timetables";
export const TEACHER_TIMETABLE_MAX_BYTES = 10 * 1024 * 1024;

export const TEACHER_TIMETABLE_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp";

const ALLOWED_MIME_TYPES = new Set(TEACHER_TIMETABLE_ACCEPT.split(","));

/** Raw uploaded timetable metadata. parsedSchedule reserved for future AI extraction. */
export type TeacherTimetableRecord = {
  id: string;
  teacherId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
};

export type ParsedTimetableSchedule = {
  version: number;
  extractedAt: string;
  periods: Array<{
    day: string;
    startTime: string;
    endTime: string;
    subject?: string;
    room?: string;
  }>;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function mapRow(row: {
  id: string;
  teacher_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
}): TeacherTimetableRecord {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    uploadedAt: row.uploaded_at,
  };
}

async function requireCurrentTeacherId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error("auth_required");
  }
  return data.user.id;
}

export function validateTeacherTimetableFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "invalid_type";
  }
  if (file.size > TEACHER_TIMETABLE_MAX_BYTES) {
    return "too_large";
  }
  return null;
}

export async function fetchTeacherTimetable(): Promise<TeacherTimetableRecord | null> {
  const teacherId = await requireCurrentTeacherId();
  const { data, error } = await supabase
    .from("teacher_timetables")
    .select("id, teacher_id, storage_path, file_name, mime_type, file_size, uploaded_at")
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) throw new Error("load_failed");
  if (!data) return null;
  return mapRow(data);
}

export async function getTeacherTimetableSignedUrl(
  storagePath: string,
): Promise<string | null> {
  const teacherId = await requireCurrentTeacherId();
  if (!storagePath.startsWith(`${teacherId}/`)) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(TEACHER_TIMETABLES_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadTeacherTimetable(file: File): Promise<TeacherTimetableRecord> {
  const teacherId = await requireCurrentTeacherId();
  const validation = validateTeacherTimetableFile(file);
  if (validation === "invalid_type") throw new Error("invalid_type");
  if (validation === "too_large") throw new Error("too_large");

  const ext = file.name.split(".").pop() || "bin";
  const storagePath = `${teacherId}/timetable-${Date.now()}-${sanitizeFileName(file.name) || `file.${ext}`}`;

  const existing = await fetchTeacherTimetable();
  const previousPath = existing?.storagePath ?? null;

  const { error: uploadError } = await supabase.storage
    .from(TEACHER_TIMETABLES_BUCKET)
    .upload(storagePath, file, {
      upsert: false,
      contentType: file.type || undefined,
      cacheControl: "3600",
    });

  if (uploadError) throw new Error("upload_failed");

  const payload = {
    teacher_id: teacherId,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    file_size: file.size,
    uploaded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("teacher_timetables")
    .upsert(payload, { onConflict: "teacher_id" })
    .select("id, teacher_id, storage_path, file_name, mime_type, file_size, uploaded_at")
    .single();

  if (error) {
    await supabase.storage.from(TEACHER_TIMETABLES_BUCKET).remove([storagePath]);
    throw new Error("save_failed");
  }

  if (previousPath && previousPath !== storagePath) {
    await supabase.storage.from(TEACHER_TIMETABLES_BUCKET).remove([previousPath]);
  }

  return mapRow(data);
}

export async function removeTeacherTimetable(): Promise<void> {
  const teacherId = await requireCurrentTeacherId();
  const existing = await fetchTeacherTimetable();
  if (!existing) return;

  if (!existing.storagePath.startsWith(`${teacherId}/`)) {
    throw new Error("remove_failed");
  }

  const { error: dbError } = await supabase
    .from("teacher_timetables")
    .delete()
    .eq("teacher_id", teacherId);

  if (dbError) throw new Error("remove_failed");

  await supabase.storage.from(TEACHER_TIMETABLES_BUCKET).remove([existing.storagePath]);
}
