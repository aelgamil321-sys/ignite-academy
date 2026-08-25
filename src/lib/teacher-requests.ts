import { supabase } from "@/integrations/supabase/client";

export type TeacherRequestStatus = "pending" | "approved" | "rejected";

export type TeacherRequestRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: TeacherRequestStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export async function fetchTeacherRequestForUser(userId: string): Promise<TeacherRequestRow | null> {
  const { data, error } = await supabase
    .from("teacher_requests")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as TeacherRequestRow | null;
}

export async function fetchPendingTeacherRequests(): Promise<TeacherRequestRow[]> {
  const { data, error } = await supabase
    .from("teacher_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TeacherRequestRow[];
}

export async function approveTeacherRequest(requestId: string): Promise<void> {
  const { data: request, error: fetchError } = await supabase
    .from("teacher_requests")
    .select("user_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!request) throw new Error("Teacher request not found.");
  if (request.status !== "pending") throw new Error("Teacher request is not pending.");

  const { data: existingRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", request.user_id)
    .eq("role", "teacher")
    .maybeSingle();

  if (!existingRole) {
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: request.user_id, role: "teacher" });
    if (roleError) throw roleError;
    const { error: profileError } = await supabase.from("teacher_profiles").upsert({
      user_id: request.user_id,
      is_lead_teacher: false,
      updated_at: new Date().toISOString(),
    });
    if (profileError) throw profileError;
  }

  const { data: authData } = await supabase.auth.getUser();
  const { error: updateError } = await supabase
    .from("teacher_requests")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: authData.user?.id ?? null,
    })
    .eq("id", requestId);

  if (updateError) throw updateError;
}

export async function rejectTeacherRequest(requestId: string): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("teacher_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: authData.user?.id ?? null,
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (error) throw error;
}
