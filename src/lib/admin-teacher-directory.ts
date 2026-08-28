import { supabase } from "@/integrations/supabase/client";
import { grades } from "@/lib/curriculum";
import {
  fetchAdminTeachers,
  type AdminTeacherRow,
  type TeacherAssignmentRow,
} from "@/lib/admin-teachers";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import {
  normalizeIslamicGroup,
  normalizeStudentSection,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";
import type { WeeklyPlanStatus } from "@/lib/weekly-planning";

export const ADMIN_TEACHER_GRADE_OPTIONS = grades.map((g) => g.slug);

export type AdminTeacherAccountStatus = "active" | "no_assignments";

export type AdminTeacherDirectoryRow = {
  userId: string;
  fullName: string;
  email: string;
  profilePhotoPath: string | null;
  accountRole: string;
  isLeadTeacher: boolean;
  accountStatus: AdminTeacherAccountStatus;
  assignedGrades: string[];
  assignedSections: StudentSection[];
  assignedIslamicGroups: IslamicGroup[];
  assignmentsCreatedCount: number;
  announcementsCreatedCount: number;
  weeklyPlansCount: number;
  weeklyPlansCompleteCount: number;
};

export type AdminTeacherActivityItem =
  | { kind: "assignment"; id: string; title: string; at: string }
  | { kind: "announcement"; id: string; title: string; at: string }
  | { kind: "weekly_plan"; id: string; title: string; status: WeeklyPlanStatus; at: string };

export type AdminTeacherDetail = {
  profile: {
    userId: string;
    fullName: string;
    email: string;
    profilePhotoPath: string | null;
    accountRole: string;
    isLeadTeacher: boolean;
    accountStatus: AdminTeacherAccountStatus;
    createdAt: string | null;
  };
  assignments: TeacherAssignmentRow[];
  assignedGrades: string[];
  assignedSections: StudentSection[];
  assignedIslamicGroups: IslamicGroup[];
  assignmentsCreatedCount: number;
  announcementsCreatedCount: number;
  weeklyPlansCount: number;
  weeklyPlansByStatus: Record<WeeklyPlanStatus, number>;
  recentActivity: AdminTeacherActivityItem[];
};

function uniqueSorted<T extends string>(values: T[]): T[] {
  return [...new Set(values)].sort();
}

function scopeFromAssignments(assignments: TeacherAssignmentRow[]): {
  assignedGrades: string[];
  assignedSections: StudentSection[];
  assignedIslamicGroups: IslamicGroup[];
} {
  const assignedGrades = uniqueSorted(
    assignments.map((a) => normalizeGradeSlug(a.grade) || a.grade).filter(Boolean),
  );
  const assignedSections = uniqueSorted(
    assignments
      .map((a) => normalizeStudentSection(a.section))
      .filter((s): s is StudentSection => s !== null),
  );
  const assignedIslamicGroups = uniqueSorted(
    assignments
      .map((a) => normalizeIslamicGroup(a.islamic_group))
      .filter((g): g is IslamicGroup => g !== null),
  );
  return { assignedGrades, assignedSections, assignedIslamicGroups };
}

function articleTitle(row: { title: unknown }): string {
  const title = row.title;
  if (title && typeof title === "object" && !Array.isArray(title)) {
    const en = (title as { en?: string }).en?.trim();
    const ar = (title as { ar?: string }).ar?.trim();
    return en || ar || "Announcement";
  }
  return "Announcement";
}

function countByUser(rows: Array<{ userId: string }>): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.userId, (map.get(row.userId) ?? 0) + 1);
  }
  return map;
}

function mapTeacherRow(
  teacher: AdminTeacherRow,
  profilePhotoPath: string | null,
  isLeadTeacher: boolean,
  assignmentCounts: Map<string, number>,
  announcementCounts: Map<string, number>,
  weeklyPlanCounts: Map<string, number>,
  weeklyPlanCompleteCounts: Map<string, number>,
): AdminTeacherDirectoryRow {
  const scope = scopeFromAssignments(teacher.assignments);
  return {
    userId: teacher.userId,
    fullName: teacher.fullName,
    email: teacher.email,
    profilePhotoPath,
    accountRole: "teacher",
    isLeadTeacher,
    accountStatus: teacher.status,
    ...scope,
    assignmentsCreatedCount: assignmentCounts.get(teacher.userId) ?? 0,
    announcementsCreatedCount: announcementCounts.get(teacher.userId) ?? 0,
    weeklyPlansCount: weeklyPlanCounts.get(teacher.userId) ?? 0,
    weeklyPlansCompleteCount: weeklyPlanCompleteCounts.get(teacher.userId) ?? 0,
  };
}

export function formatAdminTeacherSearchHaystack(row: AdminTeacherDirectoryRow): string {
  return [
    row.fullName,
    row.email,
    row.userId,
    ...row.assignedGrades.map((g) => gradeDisplayName(g, "en")),
    ...row.assignedGrades.map((g) => gradeDisplayName(g, "ar")),
    ...row.assignedSections,
    ...row.assignedIslamicGroups,
  ]
    .join(" ")
    .toLowerCase();
}

export async function fetchAdminTeacherDirectory(): Promise<{
  rows: AdminTeacherDirectoryRow[];
  error: string | null;
}> {
  try {
    const [teachers, profilesRes, teacherProfilesRes, assignmentsRes, articlesRes, plansRes] =
      await Promise.all([
        fetchAdminTeachers(),
        supabase.from("profiles").select("user_id, profile_photo_path"),
        supabase.from("teacher_profiles").select("user_id, is_lead_teacher"),
        supabase.from("assignments").select("created_by"),
        supabase.from("articles").select("created_by"),
        supabase.from("weekly_plans").select("teacher_id, status"),
      ]);

    if (profilesRes.error) return { rows: [], error: profilesRes.error.message };
    if (teacherProfilesRes.error) return { rows: [], error: teacherProfilesRes.error.message };
    if (assignmentsRes.error) return { rows: [], error: assignmentsRes.error.message };
    if (articlesRes.error) return { rows: [], error: articlesRes.error.message };
    if (plansRes.error) return { rows: [], error: plansRes.error.message };

    const photoByUser = new Map(
      (profilesRes.data ?? []).map((row) => [row.user_id, row.profile_photo_path ?? null]),
    );
    const leadByUser = new Map(
      (teacherProfilesRes.data ?? []).map((row) => [row.user_id, row.is_lead_teacher]),
    );

    const assignmentCounts = countByUser(
      (assignmentsRes.data ?? [])
        .filter((row) => row.created_by)
        .map((row) => ({ userId: row.created_by as string })),
    );
    const announcementCounts = countByUser(
      (articlesRes.data ?? [])
        .filter((row) => row.created_by)
        .map((row) => ({ userId: row.created_by as string })),
    );

    const weeklyPlanCounts = new Map<string, number>();
    const weeklyPlanCompleteCounts = new Map<string, number>();
    for (const plan of plansRes.data ?? []) {
      weeklyPlanCounts.set(plan.teacher_id, (weeklyPlanCounts.get(plan.teacher_id) ?? 0) + 1);
      if (plan.status === "complete") {
        weeklyPlanCompleteCounts.set(
          plan.teacher_id,
          (weeklyPlanCompleteCounts.get(plan.teacher_id) ?? 0) + 1,
        );
      }
    }

    const rows = teachers.map((teacher) =>
      mapTeacherRow(
        teacher,
        photoByUser.get(teacher.userId) ?? null,
        leadByUser.get(teacher.userId) ?? false,
        assignmentCounts,
        announcementCounts,
        weeklyPlanCounts,
        weeklyPlanCompleteCounts,
      ),
    );

    return { rows, error: null };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : "Failed to load teachers",
    };
  }
}

export async function fetchAdminTeacherDetail(teacherId: string): Promise<{
  detail: AdminTeacherDetail | null;
  error: string | null;
}> {
  try {
    const teachers = await fetchAdminTeachers();
    const teacher = teachers.find((row) => row.userId === teacherId);
    if (!teacher) return { detail: null, error: null };

    const [
      profileRes,
      teacherProfileRes,
      assignmentsCreatedRes,
      announcementsRes,
      plansRes,
      recentAssignmentsRes,
      recentAnnouncementsRes,
      recentPlansRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, profile_photo_path, created_at")
        .eq("user_id", teacherId)
        .maybeSingle(),
      supabase
        .from("teacher_profiles")
        .select("user_id, is_lead_teacher, created_at")
        .eq("user_id", teacherId)
        .maybeSingle(),
      supabase.from("assignments").select("id", { count: "exact", head: true }).eq("created_by", teacherId),
      supabase.from("articles").select("id", { count: "exact", head: true }).eq("created_by", teacherId),
      supabase.from("weekly_plans").select("status").eq("teacher_id", teacherId),
      supabase
        .from("assignments")
        .select("id, title_en, title_ar, created_at")
        .eq("created_by", teacherId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("articles")
        .select("id, title, created_at")
        .eq("created_by", teacherId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("weekly_plans")
        .select("id, lesson_title, status, updated_at, week_number, grade")
        .eq("teacher_id", teacherId)
        .order("updated_at", { ascending: false })
        .limit(8),
    ]);

    if (profileRes.error) return { detail: null, error: profileRes.error.message };
    if (teacherProfileRes.error) return { detail: null, error: teacherProfileRes.error.message };
    if (assignmentsCreatedRes.error) return { detail: null, error: assignmentsCreatedRes.error.message };
    if (announcementsRes.error) return { detail: null, error: announcementsRes.error.message };
    if (plansRes.error) return { detail: null, error: plansRes.error.message };
    if (recentAssignmentsRes.error) return { detail: null, error: recentAssignmentsRes.error.message };
    if (recentAnnouncementsRes.error) return { detail: null, error: recentAnnouncementsRes.error.message };
    if (recentPlansRes.error) return { detail: null, error: recentPlansRes.error.message };

    const scope = scopeFromAssignments(teacher.assignments);
    const weeklyPlansByStatus: Record<WeeklyPlanStatus, number> = {
      not_started: 0,
      in_progress: 0,
      complete: 0,
    };
    for (const plan of plansRes.data ?? []) {
      const status = plan.status as WeeklyPlanStatus;
      if (status in weeklyPlansByStatus) weeklyPlansByStatus[status] += 1;
    }

    const recentActivity: AdminTeacherActivityItem[] = [];

    for (const row of recentAssignmentsRes.data ?? []) {
      recentActivity.push({
        kind: "assignment",
        id: row.id,
        title: row.title_en?.trim() || row.title_ar?.trim() || "Assignment",
        at: row.created_at,
      });
    }
    for (const row of recentAnnouncementsRes.data ?? []) {
      recentActivity.push({
        kind: "announcement",
        id: row.id,
        title: articleTitle(row),
        at: row.created_at,
      });
    }
    for (const row of recentPlansRes.data ?? []) {
      const gradeLabel = gradeDisplayName(row.grade, "en");
      const title =
        row.lesson_title?.trim() ||
        `Week ${row.week_number} · ${gradeLabel}`;
      recentActivity.push({
        kind: "weekly_plan",
        id: row.id,
        title,
        status: row.status as WeeklyPlanStatus,
        at: row.updated_at,
      });
    }

    recentActivity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    const trimmedActivity = recentActivity.slice(0, 15);

    const detail: AdminTeacherDetail = {
      profile: {
        userId: teacher.userId,
        fullName: teacher.fullName,
        email: teacher.email,
        profilePhotoPath: profileRes.data?.profile_photo_path ?? null,
        accountRole: "teacher",
        isLeadTeacher: teacherProfileRes.data?.is_lead_teacher ?? false,
        accountStatus: teacher.status,
        createdAt: profileRes.data?.created_at ?? teacherProfileRes.data?.created_at ?? null,
      },
      assignments: teacher.assignments,
      ...scope,
      assignmentsCreatedCount: assignmentsCreatedRes.count ?? 0,
      announcementsCreatedCount: announcementsRes.count ?? 0,
      weeklyPlansCount: plansRes.data?.length ?? 0,
      weeklyPlansByStatus,
      recentActivity: trimmedActivity,
    };

    return { detail, error: null };
  } catch (error) {
    return {
      detail: null,
      error: error instanceof Error ? error.message : "Failed to load teacher",
    };
  }
}
