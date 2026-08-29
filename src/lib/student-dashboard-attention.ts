import {
  assignmentTitle,
  isAssignmentUpcoming,
  type AssignmentWithSubmission,
} from "@/lib/assignment";
import type { Bi } from "@/lib/curriculum";
import type { StudentProgressData } from "@/lib/student-progress";

export type StudentAttentionItem = {
  id: string;
  kind: "missing_assignment" | "upcoming_assignment" | "incomplete_lessons";
  title?: Bi;
  remainingLessons?: number;
  dueDate?: string;
  href: string;
};

const MAX_ITEMS = 5;

export function buildStudentAttentionItems(
  assignments: AssignmentWithSubmission[],
  progress: StudentProgressData,
): StudentAttentionItem[] {
  const now = Date.now();
  const items: StudentAttentionItem[] = [];

  for (const assignment of assignments) {
    if (items.length >= MAX_ITEMS) break;

    const dueMs = new Date(assignment.due_date).getTime();
    const isOverdue = !assignment.submission && dueMs < now;

    if (isOverdue) {
      items.push({
        id: `missing-${assignment.id}`,
        kind: "missing_assignment",
        title: assignmentTitle(assignment),
        dueDate: assignment.due_date,
        href: `/assignments/${assignment.id}`,
      });
      continue;
    }

    if (isAssignmentUpcoming(assignment, assignment.submission, now)) {
      items.push({
        id: `upcoming-${assignment.id}`,
        kind: "upcoming_assignment",
        title: assignmentTitle(assignment),
        dueDate: assignment.due_date,
        href: `/assignments/${assignment.id}`,
      });
    }
  }

  if (
    items.length < MAX_ITEMS &&
    progress.totalLessons > 0 &&
    progress.completedLessons < progress.totalLessons
  ) {
    const remaining = progress.totalLessons - progress.completedLessons;
    items.push({
      id: "incomplete-lessons",
      kind: "incomplete_lessons",
      remainingLessons: remaining,
      href: `/grades/${progress.gradeSlug}`,
    });
  }

  return items.slice(0, MAX_ITEMS);
}
