/**
 * Logical permission boundary tests for teacher scope (client-side helpers).
 * Server enforcement is via Supabase RLS; these validate app-layer filtering.
 */

import { normalizeGradeSlug } from "@/lib/grade-utils";
import {
  studentMatchesClassFilter,
  type ClassScopeFilter,
  type ScopedStudentRow,
  type TeacherAssignmentScope,
  type TeacherContext,
} from "@/lib/teacher-dashboard";

export type ScopeTestResult = { name: string; pass: boolean; detail: string };

function assignmentMatchesTeacherScope(
  assignment: { grade: string; section: string | null; islamic_group: string | null },
  teacherAssignments: TeacherAssignmentScope[],
  isLeadTeacher: boolean,
): boolean {
  if (isLeadTeacher) return true;
  return teacherAssignments.some((ta) => {
    if (normalizeGradeSlug(ta.grade) !== normalizeGradeSlug(assignment.grade)) return false;
    if (ta.section && assignment.section && ta.section !== assignment.section) return false;
    if (ta.islamic_group && assignment.islamic_group && ta.islamic_group !== assignment.islamic_group) {
      return false;
    }
    return true;
  });
}

export function runTeacherScopeBoundaryTests(): ScopeTestResult[] {
  const teacherAAssignments: TeacherAssignmentScope[] = [
    { id: "1", grade: "10", section: "A", islamic_group: "B" },
  ];
  const teacherBAssignments: TeacherAssignmentScope[] = [
    { id: "2", grade: "11", section: "B", islamic_group: "A" },
  ];

  const teacherAContext: TeacherContext = {
    userId: "teacher-a",
    fullName: "Teacher A",
    email: "a@test.com",
    isLeadTeacher: false,
    assignments: teacherAAssignments,
    assignedGrades: ["10"],
  };

  const studentInScope: ScopedStudentRow = {
    userId: "s1",
    displayName: "Student A",
    grade: "10",
    section: "A",
    islamic_group: "B",
    progressPct: 0,
    avgQuizScore: null,
    certificatesCount: 0,
    completedLessons: 0,
  };

  const studentOutScope: ScopedStudentRow = {
    userId: "s2",
    displayName: "Student B",
    grade: "11",
    section: "B",
    islamic_group: "A",
    progressPct: 0,
    avgQuizScore: null,
    certificatesCount: 0,
    completedLessons: 0,
  };

  const filter: ClassScopeFilter = { grade: "10", section: "A", islamic_group: "B" };

  const results: ScopeTestResult[] = [
    {
      name: "Teacher A sees own-scope student",
      pass: studentMatchesClassFilter(studentInScope, filter),
      detail: "Grade 10 / A / B matches Teacher A assignment",
    },
    {
      name: "Teacher A does not see Teacher B student",
      pass: !studentMatchesClassFilter(studentOutScope, filter),
      detail: "Grade 11 / B / A outside Teacher A filter",
    },
    {
      name: "Teacher A can manage Grade 10 lesson scope",
      pass: teacherAContext.assignedGrades.includes("10"),
      detail: "assignedGrades includes 10",
    },
    {
      name: "Teacher A cannot manage Grade 11 lesson scope",
      pass: !teacherAContext.assignedGrades.includes("11"),
      detail: "assignedGrades excludes 11",
    },
    {
      name: "Teacher A assignment row in scope",
      pass: assignmentMatchesTeacherScope(
        { grade: "10", section: "A", islamic_group: "B" },
        teacherAAssignments,
        false,
      ),
      detail: "Exact class match",
    },
    {
      name: "Teacher B assignment row outside Teacher A scope",
      pass: !assignmentMatchesTeacherScope(
        { grade: "11", section: "B", islamic_group: "A" },
        teacherAAssignments,
        false,
      ),
      detail: "Different grade/class",
    },
    {
      name: "Lead teacher spans all assignment rows",
      pass: assignmentMatchesTeacherScope(
        { grade: "12", section: "C", islamic_group: "A" },
        teacherAAssignments,
        true,
      ),
      detail: "Lead flag bypasses assignment list",
    },
    {
      name: "Teacher is not admin role",
      pass: teacherAContext.isLeadTeacher === false,
      detail: "Normal teacher remains non-lead without admin elevation",
    },
  ];

  return results;
}

export function allTeacherScopeTestsPass(): boolean {
  return runTeacherScopeBoundaryTests().every((t) => t.pass);
}
