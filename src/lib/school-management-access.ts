import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getAccountRole } from "@/lib/account-role";
import { isBrowser } from "@/lib/runtime";

export async function fetchIsLeadTeacher(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("teacher_profiles")
    .select("is_lead_teacher")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.is_lead_teacher ?? false;
}

/** School operational management: platform admin OR verified lead teacher. */
export async function isAdminOrLeadTeacher(userId: string): Promise<boolean> {
  const role = await getAccountRole(userId);
  if (role === "admin") return true;
  if (role !== "teacher") return false;
  return fetchIsLeadTeacher(userId);
}

export async function canManageSchool(userId: string): Promise<boolean> {
  return isAdminOrLeadTeacher(userId);
}

export async function requireSchoolManagementAccess(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) {
    throw redirect({ to: "/auth", search: { mode: "login" } });
  }
  const allowed = await canManageSchool(userId);
  if (!allowed) {
    throw redirect({ to: "/teacher" });
  }
}

/** Lead Teacher school-management routes — teacher role + is_lead_teacher only (not platform admin). */
export async function requireLeadTeacherAccess(): Promise<void> {
  if (!isBrowser()) return;

  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) {
    throw redirect({ to: "/auth", search: { mode: "login" } });
  }
  const role = await getAccountRole(userId);
  if (role === "admin") {
    throw redirect({ to: "/admin" });
  }
  if (role !== "teacher") {
    throw redirect({ to: "/teacher" });
  }
  const isLead = await fetchIsLeadTeacher(userId);
  if (!isLead) {
    throw redirect({ to: "/teacher" });
  }
}
