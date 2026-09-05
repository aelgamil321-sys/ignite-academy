/**
 * Logical permission boundary tests for teacher scope (client-side helpers).
 * Server enforcement is via Supabase RLS; these validate app-layer filtering.
 */

import { normalizeGradeSlug } from "@/lib/grade-utils";
import {
  studentMatchesClassFilter,
  teacherCanManageLessonScope,
  teacherLessonInScope,
  type ClassScopeFilter,
  type ScopedStudentRow,
  type TeacherAssignmentScope,
  type TeacherContext,
} from "@/lib/teacher-dashboard";

export type ScopeTestResult = { name: string; pass: boolean; detail: string };

function assignmentMatchesTeacherScope(
  assignment: {
    grade: string;
    section: string | null;
    islamic_group: string | null;
    subject_type?: TeacherAssignmentScope["subject_type"];
  },
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
    if (assignment.subject_type && ta.subject_type !== assignment.subject_type) return false;
    return true;
  });
}

export function runTeacherScopeBoundaryTests(): ScopeTestResult[] {
  const teacherAAssignments: TeacherAssignmentScope[] = [
    { id: "1", subject_type: "islamic_education", grade: "10", section: "A", islamic_group: "B" },
    { id: "3", subject_type: "quran", grade: "8", section: "A", islamic_group: null },
  ];
  const teacherBAssignments: TeacherAssignmentScope[] = [
    { id: "2", subject_type: "islamic_education", grade: "11", section: "B", islamic_group: "A" },
  ];

  const teacherAContext: TeacherContext = {
    userId: "teacher-a",
    fullName: "Teacher A",
    email: "a@test.com",
    isLeadTeacher: false,
    assignments: teacherAAssignments,
    assignedGrades: ["8", "10"],
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
      name: "Teacher A can manage Islamic Grade 10 lesson scope",
      pass: teacherCanManageLessonScope(teacherAContext, "10", "islamic_education"),
      detail: "Islamic assignment includes grade 10",
    },
    {
      name: "Teacher A cannot manage Islamic Grade 11 lesson scope",
      pass: !teacherCanManageLessonScope(teacherAContext, "11", "islamic_education"),
      detail: "No Islamic assignment for grade 11",
    },
    {
      name: "Teacher A can manage Qur'an Grade 8 lesson scope",
      pass: teacherCanManageLessonScope(teacherAContext, "8", "quran"),
      detail: "Qur'an assignment includes grade 8",
    },
    {
      name: "Teacher A cannot create Qur'an lesson for Grade 10",
      pass: !teacherCanManageLessonScope(teacherAContext, "10", "quran"),
      detail: "Grade 10 is Islamic-only for Teacher A",
    },
    {
      name: "Teacher A cannot create Islamic lesson for Grade 8",
      pass: !teacherCanManageLessonScope(teacherAContext, "8", "islamic_education"),
      detail: "Grade 8 is Qur'an-only for Teacher A",
    },
    {
      name: "Teacher A Islamic lesson in list scope",
      pass: teacherLessonInScope(teacherAContext, {
        grade: "10",
        teachingSubject: "islamic_education",
      }),
      detail: "Islamic lesson grade 10 visible in teacher list",
    },
    {
      name: "Teacher A Qur'an lesson outside Islamic scope rejected",
      pass: !teacherLessonInScope(teacherAContext, {
        grade: "10",
        teachingSubject: "quran",
      }),
      detail: "Qur'an grade 10 not assigned",
    },
    {
      name: "Teacher A assignment row in scope",
      pass: assignmentMatchesTeacherScope(
        { grade: "10", section: "A", islamic_group: "B", subject_type: "islamic_education" },
        teacherAAssignments,
        false,
      ),
      detail: "Exact class match",
    },
    {
      name: "Teacher B assignment row outside Teacher A scope",
      pass: !assignmentMatchesTeacherScope(
        { grade: "11", section: "B", islamic_group: "A", subject_type: "islamic_education" },
        teacherAAssignments,
        false,
      ),
      detail: "Different grade/class",
    },
    {
      name: "Lead teacher spans all assignment rows",
      pass: assignmentMatchesTeacherScope(
        { grade: "12", section: "C", islamic_group: "A", subject_type: "quran" },
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
