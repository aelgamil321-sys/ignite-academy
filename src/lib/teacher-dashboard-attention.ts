import { supabase } from "@/integrations/supabase/client";
import { fetchAllSubmissionsAdmin } from "@/lib/assignment";
import { fetchTeacherAnalytics, teacherCanUseAnalyticsFilter, type TeacherAnalyticsScope } from "@/lib/teacher-analytics";
import type { ScopedStudentRow, TeacherContext } from "@/lib/teacher-dashboard";
import { fetchTeacherWeeklyPlans } from "@/lib/weekly-planning";

export type TeacherAttentionSeverity = "high" | "medium" | "low";

export type TeacherAttentionItemType =
  | "quiz_pending_review"
  | "assignment_grading"
  | "weekly_planning"
  | "at_risk_students";

export type TeacherAttentionItem = {
  id: string;
  type: TeacherAttentionItemType;
  count: number;
  titleKey: string;
  descriptionKey: string;
  href: string;
  severity: TeacherAttentionSeverity;
};

const EMPTY_FILTERS = { grade: "", section: "", islamicGroup: "" } as const;

async function countPendingQuizReviews(scopedStudentIds: string[]): Promise<number> {
  if (scopedStudentIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("lesson_quiz_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review")
    .in("student_id", scopedStudentIds);

  if (error) throw error;
  return count ?? 0;
}

async function countAssignmentsNeedingGrading(scopedStudentIds: string[]): Promise<number> {
  if (scopedStudentIds.length === 0) return 0;

  const { data, error } = await fetchAllSubmissionsAdmin();
  if (error) throw new Error(error);

  return (data ?? []).filter(
    (submission) =>
      scopedStudentIds.includes(submission.student_id) && submission.status !== "graded",
  ).length;
}

async function countIncompleteWeeklyPlans(teacherId: string): Promise<number> {
  const plans = await fetchTeacherWeeklyPlans(teacherId);
  return plans.filter((plan) => plan.status !== "complete").length;
}

async function countAtRiskStudents(scope: TeacherAnalyticsScope): Promise<number> {
  if (!teacherCanUseAnalyticsFilter(scope, EMPTY_FILTERS)) return 0;
  const { data, error } = await fetchTeacherAnalytics(scope, EMPTY_FILTERS);
  if (error) throw new Error(error);
  return data?.atRiskStudents.length ?? 0;
}

export async function fetchTeacherDashboardAttention(
  context: TeacherContext,
  students: ScopedStudentRow[],
): Promise<TeacherAttentionItem[]> {
  const scopedStudentIds = students.map((student) => student.userId);
  const analyticsScope: TeacherAnalyticsScope = {
    isLeadTeacher: context.isLeadTeacher,
    assignments: context.assignments,
  };

  const [pendingQuizReviews, assignmentsNeedingGrading, incompletePlans, atRiskStudents] =
    await Promise.all([
      countPendingQuizReviews(scopedStudentIds),
      countAssignmentsNeedingGrading(scopedStudentIds),
      countIncompleteWeeklyPlans(context.userId),
      countAtRiskStudents(analyticsScope),
    ]);

  const items: TeacherAttentionItem[] = [];

  if (pendingQuizReviews > 0) {
    items.push({
      id: "quiz_pending_review",
      type: "quiz_pending_review",
      count: pendingQuizReviews,
      titleKey: "teacher_attn_quiz_review_title",
      descriptionKey: "teacher_attn_quiz_review_desc",
      href: "/teacher/quizzes",
      severity: "high",
    });
  }

  if (assignmentsNeedingGrading > 0) {
    items.push({
      id: "assignment_grading",
      type: "assignment_grading",
      count: assignmentsNeedingGrading,
      titleKey: "teacher_attn_assignment_title",
      descriptionKey: "teacher_attn_assignment_desc",
      href: "/teacher/assignments/submissions",
      severity: "high",
    });
  }

  if (incompletePlans > 0) {
    items.push({
      id: "weekly_planning",
      type: "weekly_planning",
      count: incompletePlans,
      titleKey: "teacher_attn_weekly_plan_title",
      descriptionKey: "teacher_attn_weekly_plan_desc",
      href: "/teacher/weekly-planning",
      severity: "medium",
    });
  }

  if (atRiskStudents > 0) {
    items.push({
      id: "at_risk_students",
      type: "at_risk_students",
      count: atRiskStudents,
      titleKey: "teacher_attn_at_risk_title",
      descriptionKey: "teacher_attn_at_risk_desc",
      href: "/teacher/performance",
      severity: "medium",
    });
  }

  return items;
}
