import { supabase } from "@/integrations/supabase/client";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import {
  DEFAULT_TEACHING_SUBJECT,
  normalizeTeachingSubjectType,
  type TeachingSubjectType,
} from "@/lib/teacher-assignment-subject";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";
import {
  DEFAULT_TEACHING_SUBJECT,
  normalizeTeachingSubjectType,
  type TeachingSubjectType,
} from "@/lib/teacher-assignment-subject";
import {
  fetchTeacherDisplayNames,
  resolveTeacherDisplayName,
  type TeacherIdentitySource,
} from "@/lib/teacher-identity";

export type TeacherAssignmentRow = {
  id: string;
  teacher_id: string;
  subject_type: TeachingSubjectType;
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
  assignments: TeacherAssignmentRow[];
};

export type TeacherAssignmentInput = {
  subject_type: TeachingSubjectType;
  grade: string;
  section: StudentSection | null;
  islamic_group: IslamicGroup | null;
};

function displayName(
  userId: string,
  profileMap: Map<string, TeacherIdentitySource & { email: string }>,
  parentMap: Map<string, { full_name: string; email: string }>,
  teacherRequestMap: Map<string, { full_name: string; email: string }>,
  rpcNameMap: Record<string, string>,
): { fullName: string; email: string } {
  const profile = profileMap.get(userId);
  if (profile) {
    return {
      fullName: resolveTeacherDisplayName(userId, profile, rpcNameMap[userId]),
      email: profile.email,
    };
  }
  const parent = parentMap.get(userId);
  if (parent) {
    return {
      fullName: resolveTeacherDisplayName(userId, parent, rpcNameMap[userId]),
      email: parent.email,
    };
  }
  const request = teacherRequestMap.get(userId);
  if (request) {
    return {
      fullName: resolveTeacherDisplayName(userId, request, rpcNameMap[userId]),
      email: request.email,
    };
  }
  return {
    fullName: resolveTeacherDisplayName(userId, {}, rpcNameMap[userId]),
    email: "",
  };
}

export async function fetchAdminTeachers(): Promise<AdminTeacherRow[]> {
  const [rolesRes, assignmentsRes, profilesRes, parentProfilesRes, teacherRequestsRes] =
    await Promise.all([
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("teacher_assignments").select("*").order("grade").order("section"),
      supabase.from("profiles").select("user_id, full_name, english_name, arabic_name, email"),
      supabase.from("parent_profiles").select("user_id, full_name, email"),
      supabase.from("teacher_requests").select("user_id, full_name, email"),
    ]);

  if (rolesRes.error) throw rolesRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (parentProfilesRes.error) throw parentProfilesRes.error;
  if (teacherRequestsRes.error) throw teacherRequestsRes.error;

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

  const needsRpc = teacherIds.filter((userId) => {
    const profile = profileMap.get(userId);
    const request = teacherRequestMap.get(userId);
    const resolved = resolveTeacherDisplayName(userId, profile ?? request ?? {});
    return resolved === "—";
  });
  const rpcNameMap = await fetchTeacherDisplayNames(needsRpc);

  const assignmentsByTeacher = new Map<string, TeacherAssignmentRow[]>();
  for (const row of assignmentsRes.data ?? []) {
    const list = assignmentsByTeacher.get(row.teacher_id) ?? [];
    list.push({
      ...row,
      subject_type: normalizeTeachingSubjectType(row.subject_type),
    } as TeacherAssignmentRow);
    assignmentsByTeacher.set(row.teacher_id, list);
  }

  return teacherIds.map((userId) => {
    const assignments = assignmentsByTeacher.get(userId) ?? [];
    const { fullName, email } = displayName(
      userId,
      profileMap,
      parentMap,
      teacherRequestMap,
      rpcNameMap,
    );
    return {
      userId,
      fullName,
      email,
      status: assignments.length > 0 ? "active" : "no_assignments",
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

export async function addTeacherAssignment(
  teacherId: string,
  input: TeacherAssignmentInput,
): Promise<void> {
  const { error } = await supabase.from("teacher_assignments").insert({
    teacher_id: teacherId,
    subject_type: normalizeTeachingSubjectType(input.subject_type ?? DEFAULT_TEACHING_SUBJECT),
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
      subject_type: normalizeTeachingSubjectType(input.subject_type ?? DEFAULT_TEACHING_SUBJECT),
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
