import { supabase } from "@/integrations/supabase/client";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";

export type TeacherAssignmentRow = {
  id: string;
  teacher_id: string;
  grade: string;
  section: string | null;
  islamic_group: string | null;
  created_at: string;
};

export type RegisteredUserOption = {
  userId: string;
  fullName: string;
  email: string;
  source: "student" | "parent";
};

export type AdminTeacherRow = {
  userId: string;
  fullName: string;
  email: string;
  status: "active" | "no_assignments";
  isLeadTeacher: boolean;
  assignments: TeacherAssignmentRow[];
};

export type TeacherAssignmentInput = {
  grade: string;
  section: StudentSection | null;
  islamic_group: IslamicGroup | null;
};

function displayName(
  userId: string,
  profileMap: Map<string, { full_name: string; email: string }>,
  parentMap: Map<string, { full_name: string; email: string }>,
  teacherRequestMap: Map<string, { full_name: string; email: string }>,
): { fullName: string; email: string } {
  const profile = profileMap.get(userId);
  if (profile) {
    return {
      fullName: profile.full_name || profile.email || userId,
      email: profile.email,
    };
  }
  const parent = parentMap.get(userId);
  if (parent) {
    return {
      fullName: parent.full_name || parent.email || userId,
      email: parent.email,
    };
  }
  const request = teacherRequestMap.get(userId);
  if (request) {
    return {
      fullName: request.full_name || request.email || userId,
      email: request.email,
    };
  }
  return { fullName: userId, email: "" };
}

export async function fetchAdminTeachers(): Promise<AdminTeacherRow[]> {
  const [rolesRes, assignmentsRes, profilesRes, parentProfilesRes, teacherRequestsRes, teacherProfilesRes] = await Promise.all([
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("teacher_assignments").select("*").order("grade").order("section"),
    supabase.from("profiles").select("user_id, full_name, email"),
    supabase.from("parent_profiles").select("user_id, full_name, email"),
    supabase.from("teacher_requests").select("user_id, full_name, email"),
    supabase.from("teacher_profiles").select("user_id, is_lead_teacher"),
  ]);

  if (rolesRes.error) throw rolesRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (parentProfilesRes.error) throw parentProfilesRes.error;
  if (teacherRequestsRes.error) throw teacherRequestsRes.error;
  if (teacherProfilesRes.error) throw teacherProfilesRes.error;

  const leadTeacherMap = new Map(
    (teacherProfilesRes.data ?? []).map((row) => [row.user_id, row.is_lead_teacher]),
  );

  const teacherIds = (rolesRes.data ?? [])
    .filter((row) => row.role === "teacher")
    .map((row) => row.user_id);

  const profileMap = new Map(
    (profilesRes.data ?? []).map((row) => [row.user_id, row]),
  );
  const parentMap = new Map(
    (parentProfilesRes.data ?? []).map((row) => [row.user_id, row]),
  );
  const teacherRequestMap = new Map(
    (teacherRequestsRes.data ?? []).map((row) => [row.user_id, row]),
  );

  const assignmentsByTeacher = new Map<string, TeacherAssignmentRow[]>();
  for (const row of assignmentsRes.data ?? []) {
    const list = assignmentsByTeacher.get(row.teacher_id) ?? [];
    list.push(row as TeacherAssignmentRow);
    assignmentsByTeacher.set(row.teacher_id, list);
  }

  return teacherIds.map((userId) => {
    const assignments = assignmentsByTeacher.get(userId) ?? [];
    const { fullName, email } = displayName(userId, profileMap, parentMap, teacherRequestMap);
    return {
      userId,
      fullName,
      email,
      status: assignments.length > 0 ? "active" : "no_assignments",
      isLeadTeacher: leadTeacherMap.get(userId) ?? false,
      assignments,
    };
  });
}

export async function fetchRegisteredUserOptions(): Promise<RegisteredUserOption[]> {
  const [profilesRes, parentProfilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, email").order("full_name"),
    supabase.from("parent_profiles").select("user_id, full_name, email").order("full_name"),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (parentProfilesRes.error) throw parentProfilesRes.error;
  if (rolesRes.error) throw rolesRes.error;

  const adminIds = new Set(
    (rolesRes.data ?? []).filter((row) => row.role === "admin").map((row) => row.user_id),
  );
  const teacherIds = new Set(
    (rolesRes.data ?? []).filter((row) => row.role === "teacher").map((row) => row.user_id),
  );

  const options: RegisteredUserOption[] = [];
  const seen = new Set<string>();

  for (const row of profilesRes.data ?? []) {
    if (adminIds.has(row.user_id) || teacherIds.has(row.user_id) || seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    options.push({
      userId: row.user_id,
      fullName: row.full_name || row.email,
      email: row.email,
      source: "student",
    });
  }

  for (const row of parentProfilesRes.data ?? []) {
    if (adminIds.has(row.user_id) || teacherIds.has(row.user_id) || seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    options.push({
      userId: row.user_id,
      fullName: row.full_name || row.email,
      email: row.email,
      source: "parent",
    });
  }

  return options.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function grantTeacherRole(userId: string): Promise<void> {
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "teacher" });
  if (error) throw error;
  const { error: profileError } = await supabase.from("teacher_profiles").upsert({
    user_id: userId,
    is_lead_teacher: false,
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;
}

export async function revokeTeacherRole(userId: string): Promise<void> {
  const { error: assignmentsError } = await supabase
    .from("teacher_assignments")
    .delete()
    .eq("teacher_id", userId);
  if (assignmentsError) throw assignmentsError;

  const { error: profileError } = await supabase
    .from("teacher_profiles")
    .delete()
    .eq("user_id", userId);
  if (profileError) throw profileError;

  const { error: roleError } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", "teacher");
  if (roleError) throw roleError;
}

export async function setTeacherLeadStatus(userId: string, isLeadTeacher: boolean): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("teacher_profiles").upsert({
    user_id: userId,
    is_lead_teacher: isLeadTeacher,
    lead_granted_by: isLeadTeacher ? auth.user?.id ?? null : null,
    lead_granted_at: isLeadTeacher ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function addTeacherAssignment(
  teacherId: string,
  input: TeacherAssignmentInput,
): Promise<void> {
  const { error } = await supabase.from("teacher_assignments").insert({
    teacher_id: teacherId,
    grade: normalizeGradeSlug(input.grade),
    section: input.section,
    islamic_group: input.islamic_group,
  });
  if (error) throw error;
}

export async function updateTeacherAssignment(
  assignmentId: string,
  input: TeacherAssignmentInput,
): Promise<void> {
  const { error } = await supabase
    .from("teacher_assignments")
    .update({
      grade: normalizeGradeSlug(input.grade),
      section: input.section,
      islamic_group: input.islamic_group,
    })
    .eq("id", assignmentId);
  if (error) throw error;
}

export async function removeTeacherAssignment(assignmentId: string): Promise<void> {
  const { error } = await supabase.from("teacher_assignments").delete().eq("id", assignmentId);
  if (error) throw error;
}

export function findRegisteredUserByEmail(
  email: string,
  options: RegisteredUserOption[],
): RegisteredUserOption | undefined {
  const normalized = email.trim().toLowerCase();
  return options.find((option) => option.email.trim().toLowerCase() === normalized);
}
