import { supabase } from "@/integrations/supabase/client";
import { grades } from "@/lib/curriculum";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import {
  ANALYTICS_UNSET_KEY,
  buildAdminAnalytics,
  type AdminAnalyticsSnapshot,
  type AnalyticsFilters,
} from "@/lib/admin-analytics";
import {
  normalizeIslamicGroup,
  normalizeStudentSection,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";
import {
  buildUserRoleIndex,
  filterProfilesToStudents,
} from "@/lib/student-account";
import type { TeacherAssignmentScope } from "@/lib/teacher-dashboard";

export type TeacherAnalyticsScope = {
  isLeadTeacher: boolean;
  assignments: TeacherAssignmentScope[];
};

function assignmentCoversStudentScope(
  assignment: TeacherAssignmentScope,
  grade: string,
  section: StudentSection | null,
  islamicGroup: IslamicGroup | null,
): boolean {
  const normalizedGrade = normalizeGradeSlug(grade);
  const assignmentGrade = normalizeGradeSlug(assignment.grade);
  if (!normalizedGrade || assignmentGrade !== normalizedGrade) return false;
  if (assignment.section && section !== assignment.section) return false;
  if (assignment.islamic_group && islamicGroup !== assignment.islamic_group) return false;
  return true;
}

export function teacherAssignmentCoversFilter(
  assignment: TeacherAssignmentScope,
  filters: AnalyticsFilters,
): boolean {
  if (filters.grade && normalizeGradeSlug(assignment.grade) !== normalizeGradeSlug(filters.grade)) {
    return false;
  }

  if (filters.section) {
    if (filters.section === ANALYTICS_UNSET_KEY) {
      // unset section filter is department-wide; only null-section assignments cover it
      if (assignment.section !== null) return false;
    } else if (assignment.section !== null && assignment.section !== filters.section) {
      return false;
    }
  }

  if (filters.islamicGroup) {
    if (filters.islamicGroup === ANALYTICS_UNSET_KEY) {
      if (assignment.islamic_group !== null) return false;
    } else if (
      assignment.islamic_group !== null &&
      assignment.islamic_group !== filters.islamicGroup
    ) {
      return false;
    }
  }

  return true;
}

export function teacherCanUseAnalyticsFilter(
  scope: TeacherAnalyticsScope,
  filters: AnalyticsFilters,
): boolean {
  if (scope.isLeadTeacher) return true;
  if (scope.assignments.length === 0) return false;
  return scope.assignments.some((assignment) => teacherAssignmentCoversFilter(assignment, filters));
}

export function teacherCanCompareAnalyticsFilters(
  scope: TeacherAnalyticsScope,
  left: AnalyticsFilters,
  right: AnalyticsFilters,
): boolean {
  if (scope.isLeadTeacher) return true;
  return (
    teacherCanUseAnalyticsFilter(scope, left) && teacherCanUseAnalyticsFilter(scope, right)
  );
}

export function teacherAllowedGradeOptions(scope: TeacherAnalyticsScope): string[] {
  if (scope.isLeadTeacher) return grades.map((g) => g.slug);
  const slugs = scope.assignments.map((a) => normalizeGradeSlug(a.grade) || a.grade);
  return [...new Set(slugs)];
}

export async function fetchTeacherAnalytics(
  scope: TeacherAnalyticsScope,
  filters: AnalyticsFilters,
): Promise<{ data: AdminAnalyticsSnapshot | null; error: string | null }> {
  if (!teacherCanUseAnalyticsFilter(scope, filters)) {
    return { data: null, error: "Analytics scope not permitted for this teacher." };
  }

  const [profilesRes, rolesRes, submissionsRes, certificatesRes] = await Promise.all([
    supabase.from("profiles").select(
      "user_id, full_name, arabic_name, english_name, profile_photo_path, grade, section, islamic_group",
    ),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("lesson_quiz_submissions").select("student_id, percentage"),
    supabase.from("quiz_certificates").select("student_id"),
  ]);

  if (profilesRes.error) return { data: null, error: profilesRes.error.message };
  if (rolesRes.error) return { data: null, error: rolesRes.error.message };
  if (submissionsRes.error) return { data: null, error: submissionsRes.error.message };
  if (certificatesRes.error) return { data: null, error: certificatesRes.error.message };

  const roleIndex = buildUserRoleIndex(rolesRes.data ?? []);
  let students = filterProfilesToStudents(profilesRes.data ?? []);

  if (!scope.isLeadTeacher) {
    students = students.filter((profile) => {
      const section = normalizeStudentSection(profile.section);
      const islamicGroup = normalizeIslamicGroup(profile.islamic_group);
      return scope.assignments.some((assignment) =>
        assignmentCoversStudentScope(assignment, profile.grade ?? "", section, islamicGroup),
      );
    });
  }

  return {
    data: buildAdminAnalytics(
      students,
      submissionsRes.data ?? [],
      certificatesRes.data ?? [],
      filters,
    ),
    error: null,
  };
}
