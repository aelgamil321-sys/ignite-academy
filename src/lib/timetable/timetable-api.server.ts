import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { TEACHER_TIMETABLES_BUCKET } from "@/lib/teacher-timetable";
import { runTeacherTimetableExtraction } from "@/lib/timetable/timetable-extract-pipeline.server";
import {
  timetableScheduleSchema,
  type TimetableSchedule,
} from "@/lib/timetable/timetable-types";
import {
  normalizeTimetableSchedule,
} from "@/lib/timetable/timetable-weekday";
import { ensureFixedGridSchedule } from "@/lib/timetable/timetable-grid";
import { TIMETABLE_GRID_VERSION } from "@/lib/timetable/timetable-types";

async function requireTeacherId(): Promise<string> {
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("auth_required");
  }
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) throw new Error("auth_required");

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("server_misconfigured");

  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Error("auth_required");
  return data.claims.sub;
}

async function loadTeacherTimetableRow(teacherId: string) {
  const { data, error } = await supabaseAdmin
    .from("teacher_timetables")
    .select("id, teacher_id, storage_path, file_name, mime_type")
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (error) throw new Error("load_failed");
  if (!data) throw new Error("no_timetable_file");
  if (data.teacher_id !== teacherId) throw new Error("forbidden");
  if (!data.storage_path.startsWith(`${teacherId}/`)) throw new Error("forbidden");
  return data;
}

export async function handleExtractTeacherTimetable(): Promise<{
  ok: true;
  schedule: TimetableSchedule;
  needsReview: boolean;
  fileName: string;
}> {
  const teacherId = await requireTeacherId();
  const row = await loadTeacherTimetableRow(teacherId);

  const { data: blob, error: downloadError } = await supabaseAdmin.storage
    .from(TEACHER_TIMETABLES_BUCKET)
    .download(row.storage_path);
  if (downloadError || !blob) throw new Error("download_failed");

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const result = await runTeacherTimetableExtraction({
    bytes,
    fileName: row.file_name,
    mimeType: row.mime_type,
    teacherId,
  });

  if (!result.ok) {
    console.error("[timetable-extract] failed", {
      teacherId,
      fileName: row.file_name,
      mimeType: row.mime_type,
      errorCode: result.errorCode,
    });
    throw new Error(result.errorCode);
  }

  return {
    ok: true,
    schedule: result.schedule,
    needsReview: result.needsReview,
    fileName: row.file_name,
  };
}

const confirmSchema = z.object({
  schedule: timetableScheduleSchema,
});

export async function handleConfirmTeacherTimetable(
  data: z.infer<typeof confirmSchema>,
): Promise<{ ok: true }> {
  const teacherId = await requireTeacherId();
  const row = await loadTeacherTimetableRow(teacherId);
  const schedule = ensureFixedGridSchedule(
    normalizeTimetableSchedule({
      ...data.schedule,
      confirmedAt: new Date().toISOString(),
      version: TIMETABLE_GRID_VERSION,
    }),
  );

  const { error } = await supabaseAdmin
    .from("teacher_timetables")
    .update({
      parsed_schedule: schedule,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("teacher_id", teacherId);

  if (error) throw new Error("save_failed");
  return { ok: true };
}

export { confirmSchema };
