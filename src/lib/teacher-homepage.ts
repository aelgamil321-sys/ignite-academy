import { grades } from "@/lib/curriculum";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import type { StageCardKey } from "@/lib/stage-images";
import type { TeacherAssignmentScope, TeacherContext } from "@/lib/teacher-dashboard";

export type TeacherHomeGradeCard = {
  gradeSlug: string;
  stageKey: StageCardKey;
  assignment: TeacherAssignmentScope | null;
};

export function gradeSlugToStageKey(gradeSlug: string): StageCardKey {
  const slug = normalizeGradeSlug(gradeSlug) || gradeSlug;
  if (slug === "kg1" || slug === "kg2") return "kg";
  if (["1", "2", "3", "4", "5"].includes(slug)) return "elementary";
  if (["6", "7", "8"].includes(slug)) return "middle";
  return "high";
}

/** Grade/stage cards for teacher homepage — derived from assignments or lead scope (not client-filtered platform data). */
export function teacherHomeGradeCards(context: TeacherContext): TeacherHomeGradeCard[] {
  if (context.isLeadTeacher) {
    return grades.map((grade) => ({
      gradeSlug: grade.slug,
      stageKey: gradeSlugToStageKey(grade.slug),
      assignment: null,
    }));
  }

  if (context.assignments.length === 0) return [];

  return context.assignments.map((assignment) => ({
    gradeSlug: normalizeGradeSlug(assignment.grade) || assignment.grade,
    stageKey: gradeSlugToStageKey(assignment.grade),
    assignment,
  }));
}

export function teacherHomeVisibleGradeSlugs(context: TeacherContext): string[] {
  if (context.isLeadTeacher) {
    return grades.map((g) => g.slug);
  }
  return [...new Set(context.assignments.map((a) => normalizeGradeSlug(a.grade) || a.grade))];
}
