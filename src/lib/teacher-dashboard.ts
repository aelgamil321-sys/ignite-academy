import { supabase } from "@/integrations/supabase/client";
import { fetchTeacherDisplayName, resolveTeacherDisplayName } from "@/lib/teacher-identity";
import {
  buildUserRoleIndex,
  filterProfilesToStudents,
} from "@/lib/student-account";
import { grades } from "@/lib/curriculum";
import { gradeMatches, normalizeGradeSlug } from "@/lib/grade-utils";
import { fetchStudentProgress } from "@/lib/student-progress";
import {
  formatStudentAcademics,
  islamicGroupLabel,
  ISLAMIC_GROUPS,
  normalizeIslamicGroup,
  normalizeStudentSection,
  sectionLabel,
  STUDENT_SECTIONS,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";
import type { Lang } from "@/lib/i18n-config";
import { translateKey } from "@/lib/i18n";
import {
  DEFAULT_TEACHING_SUBJECT,
  normalizeTeachingSubjectType,
  type TeachingSubjectType,
} from "@/lib/teacher-assignment-subject";

export type TeacherAssignmentScope = {
  id: string;
  subject_type: TeachingSubjectType;
  grade: string;
  section: StudentSection | null;
  islamic_group: IslamicGroup | null;
};

export type TeacherContext = {
  userId: string;
  fullName: string;
  email: string;
  isLeadTeacher: boolean;
  assignments: TeacherAssignmentScope[];
  assignedGrades: string[];
};

export type ScopedStudentRow = {
  userId: string;
  displayName: string;
  grade: string;
  section: StudentSection | null;
  islamic_group: IslamicGroup | null;
  progressPct: number;
  avgQuizScore: number | null;
  certificatesCount: number;
  completedLessons: number;
};

export type TeacherOverviewStats = {
  studentCount: number;
  classCount: number;
  lessonCount: number;
  quizCount: number;
  assignmentCount: number;
  submittedAssignmentsCount: number;
  avgQuizScore: number | null;
};

export type ClassScopeFilter = {
  grade?: string;
  section?: StudentSection | "";
  islamic_group?: IslamicGroup | "";
  subject_type?: TeachingSubjectType | "";
};

export function formatClassScopeLabel(
  assignment: Pick<TeacherAssignmentScope, "grade" | "section" | "islamic_group">,
  lang: Lang,
): string {
  const grade = normalizeGradeSlug(assignment.grade) || assignment.grade;
  const sectionText = assignment.section
    ? sectionLabel(assignment.section, lang)
    : translateKey("teacher_all_sections", lang);
  const groupText = assignment.islamic_group
    ? islamicGroupLabel(assignment.islamic_group, lang)
    : translateKey("teacher_all_groups", lang);
  return `${grade} — ${sectionText} — ${groupText}`;
}

export function studentMatchesClassFilter(
  student: Pick<ScopedStudentRow, "grade" | "section" | "islamic_group">,
  filter: ClassScopeFilter,
): boolean {
  if (filter.grade && normalizeGradeSlug(student.grade) !== normalizeGradeSlug(filter.grade)) {
    return false;
  }
  if (filter.section && student.section !== filter.section) return false;
  if (filter.islamic_group && student.islamic_group !== filter.islamic_group) return false;
  return true;
}

/** Whether a student falls within the teacher's assigned grade/section/group scope. */
export function studentMatchesTeacherAssignmentScope(
  student: Pick<ScopedStudentRow, "grade" | "section" | "islamic_group">,
  context: Pick<TeacherContext, "isLeadTeacher" | "assignments">,
): boolean {
  if (context.isLeadTeacher) return true;
  if (context.assignments.length === 0) return false;
  return context.assignments.some((assignment) => {
    if (normalizeGradeSlug(assignment.grade) !== normalizeGradeSlug(student.grade)) return false;
    if (assignment.section !== null && student.section !== assignment.section) return false;
    if (assignment.islamic_group !== null && student.islamic_group !== assignment.islamic_group) {
      return false;
    }
    return true;
  });
}

export function filterStudentsByTeacherScope(
  students: ScopedStudentRow[],
  context: TeacherContext,
): ScopedStudentRow[] {
  return students.filter((student) => studentMatchesTeacherAssignmentScope(student, context));
}

/** Grade slugs the teacher may report on — derived from assignments (or full catalog for lead teachers). */
export function teacherReportGradeOptions(context: TeacherContext): string[] {
  const slugs = context.isLeadTeacher
    ? context.assignedGrades
    : [
        ...new Set(
          context.assignments.map((a) => normalizeGradeSlug(a.grade) || a.grade).filter(Boolean),
        ),
      ];
  return slugs.sort((a, b) => {
    const ai = grades.findIndex((g) => g.slug === a);
    const bi = grades.findIndex((g) => g.slug === b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

/**
 * Section options for reports — derived from teacher assignments for the grade.
 * Sections remain available even when no students or analytics exist yet.
 */
export function teacherReportSectionOptions(
  context: TeacherContext,
  grade: string,
): StudentSection[] {
  if (!grade) return [];

  if (context.isLeadTeacher) {
    return [...STUDENT_SECTIONS];
  }

  const matching = context.assignments.filter((assignment) =>
    gradeMatches(assignment.grade, grade),
  );
  if (matching.length === 0) return [];

  const sectionSet = new Set<StudentSection>();
  let wholeGrade = false;

  for (const assignment of matching) {
    if (assignment.section === null) {
      wholeGrade = true;
    } else {
      sectionSet.add(assignment.section);
    }
  }

  if (wholeGrade) {
    return [...STUDENT_SECTIONS];
  }

  return [...sectionSet].sort(
    (a, b) => STUDENT_SECTIONS.indexOf(a) - STUDENT_SECTIONS.indexOf(b),
  );
}

export async function fetchTeacherContext(userId: string): Promise<TeacherContext> {
  const [assignmentsRes, profileRes, teacherProfileRes] = await Promise.all([
    supabase.from("teacher_assignments").select("*").eq("teacher_id", userId).order("grade"),
    supabase
      .from("profiles")
      .select("full_name, english_name, arabic_name, email")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("teacher_profiles")
      .select("is_lead_teacher")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (assignmentsRes.error) throw assignmentsRes.error;
  if (teacherProfileRes.error) throw teacherProfileRes.error;

  const isLeadTeacher = teacherProfileRes.data?.is_lead_teacher ?? false;

  const assignments: TeacherAssignmentScope[] = (assignmentsRes.data ?? []).map((row) => ({
    id: row.id,
    subject_type: normalizeTeachingSubjectType(row.subject_type),
    grade: row.grade,
    section: normalizeStudentSection(row.section),
    islamic_group: normalizeIslamicGroup(row.islamic_group),
  }));

  const assignedGrades = isLeadTeacher
    ? grades.map((g) => g.slug)
    : [...new Set(assignments.map((a) => normalizeGradeSlug(a.grade) || a.grade))];

  let fullName = resolveTeacherDisplayName(userId, profileRes.data ?? {});
  if (fullName === "—") {
    fullName = await fetchTeacherDisplayName(userId);
  }
  const email = profileRes.data?.email || "";

  return {
    userId,
    fullName,
    email,
    isLeadTeacher,
    assignments,
    assignedGrades,
  };
}

export async function fetchScopedStudents(): Promise<ScopedStudentRow[]> {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, full_name, arabic_name, english_name, grade, section, islamic_group"),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (rolesRes.error) throw rolesRes.error;

  const roleIndex = buildUserRoleIndex(rolesRes.data ?? []);
  const studentProfiles = filterProfilesToStudents(profilesRes.data ?? [], roleIndex);

  const students = studentProfiles.map((p) => ({
    userId: p.user_id,
    displayName:
      (p.english_name?.trim() || p.arabic_name?.trim() || p.full_name?.trim() || "—") ?? "—",
    grade: normalizeGradeSlug(p.grade ?? "") || String(p.grade ?? ""),
    section: normalizeStudentSection(p.section),
    islamic_group: normalizeIslamicGroup(p.islamic_group),
  }));

  const userIds = students.map((s) => s.userId);
  if (userIds.length === 0) return [];

  const [submissionsRes, certificatesRes] = await Promise.all([
    supabase
      .from("lesson_quiz_submissions")
      .select("student_id, lesson_id, percentage, status")
      .in("student_id", userIds),
    supabase.from("quiz_certificates").select("student_id").in("student_id", userIds),
  ]);

  if (submissionsRes.error) throw submissionsRes.error;
  if (certificatesRes.error) throw certificatesRes.error;

  const submissions = submissionsRes.data ?? [];
  const certificates = certificatesRes.data ?? [];

  const gradeLessonCounts = new Map<string, number>();
  const grades = [...new Set(students.map((s) => s.grade).filter(Boolean))];
  if (grades.length > 0) {
    const { data: lessonRows } = await supabase
      .from("lessons")
      .select("grade")
      .eq("published", true)
      .in("grade", grades);
    for (const g of grades) {
      const count = (lessonRows ?? []).filter((l) => normalizeGradeSlug(l.grade) === g).length;
      gradeLessonCounts.set(g, count);
    }
  }

  return students.map((student) => {
    const studentSubs = submissions.filter((s) => s.student_id === student.userId);
    const reviewed = studentSubs.filter((s) => s.status !== "pending_review");
    const completedLessons = new Set(studentSubs.map((s) => s.lesson_id)).size;
    const totalLessons = gradeLessonCounts.get(student.grade) ?? 0;
    const progressPct =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 1000) / 10 : 0;
    const avgQuizScore =
      reviewed.length > 0
        ? Math.round(
            (reviewed.reduce((sum, s) => sum + Number(s.percentage ?? 0), 0) / reviewed.length) * 10,
          ) / 10
        : null;
    const certificatesCount = certificates.filter((c) => c.student_id === student.userId).length;

    return {
      ...student,
      progressPct,
      avgQuizScore,
      certificatesCount,
      completedLessons,
    };
  });
}

export async function fetchTeacherOverviewStats(
  context: TeacherContext,
  students: ScopedStudentRow[],
): Promise<TeacherOverviewStats> {
  const gradeSlugs = context.isLeadTeacher
    ? grades.map((g) => g.slug)
    : context.assignedGrades;

  const [lessonsRes, assignmentsRes, submissionsRes] = await Promise.all([
    gradeSlugs.length > 0
      ? supabase.from("lessons").select("id", { count: "exact", head: true }).in("grade", gradeSlugs)
      : Promise.resolve({ count: 0, error: null }),
    supabase.from("assignments").select("id", { count: "exact", head: true }),
    supabase.from("assignment_submissions").select("id", { count: "exact", head: true }),
  ]);

  if (lessonsRes.error) throw lessonsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (submissionsRes.error) throw submissionsRes.error;

  const quizSubmissionCount = students.reduce((sum, s) => sum + s.completedLessons, 0);
  const scored = students.filter((s) => s.avgQuizScore !== null);
  const avgQuizScore =
    scored.length > 0
      ? Math.round((scored.reduce((sum, s) => sum + (s.avgQuizScore ?? 0), 0) / scored.length) * 10) / 10
      : null;

  return {
    studentCount: students.length,
    classCount: context.assignments.length,
    lessonCount: lessonsRes.count ?? 0,
    quizCount: quizSubmissionCount,
    assignmentCount: assignmentsRes.count ?? 0,
    submittedAssignmentsCount: submissionsRes.count ?? 0,
    avgQuizScore,
  };
}

export async function fetchScopedStudentDetail(userId: string) {
  const progress = await fetchStudentProgress(userId);
  return progress;
}

export function formatStudentScopeLabel(
  student: Pick<ScopedStudentRow, "grade" | "section" | "islamic_group">,
  lang: Lang,
): string {
  return formatStudentAcademics(
    {
      section: student.section,
      islamicGroup: student.islamic_group,
    },
    lang,
  );
}

export type ScopedParentRow = {
  userId: string;
  displayName: string;
  email: string;
  linkedStudents: Array<{ userId: string; displayName: string }>;
};

export async function fetchScopedParents(students: ScopedStudentRow[]): Promise<ScopedParentRow[]> {
  const studentIds = students.map((s) => s.userId);
  if (studentIds.length === 0) return [];

  const { data: links, error: linksError } = await supabase
    .from("parent_student_links")
    .select("parent_user_id, student_user_id")
    .in("student_user_id", studentIds);

  if (linksError) throw linksError;

  const studentNameMap = new Map(students.map((s) => [s.userId, s.displayName]));
  const parentToStudents = new Map<string, string[]>();

  for (const link of links ?? []) {
    const list = parentToStudents.get(link.parent_user_id) ?? [];
    list.push(link.student_user_id);
    parentToStudents.set(link.parent_user_id, list);
  }

  const parentIds = [...parentToStudents.keys()];
  if (parentIds.length === 0) return [];

  const [profilesRes, parentProfilesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, full_name, email, english_name, arabic_name")
      .in("user_id", parentIds),
    supabase.from("parent_profiles").select("user_id, full_name, email").in("user_id", parentIds),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (parentProfilesRes.error) throw parentProfilesRes.error;

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p]));
  const parentProfileMap = new Map((parentProfilesRes.data ?? []).map((p) => [p.user_id, p]));

  return parentIds.map((parentId) => {
    const profile = profileMap.get(parentId);
    const parentProfile = parentProfileMap.get(parentId);
    const displayName =
      parentProfile?.full_name?.trim() ||
      profile?.english_name?.trim() ||
      profile?.arabic_name?.trim() ||
      profile?.full_name?.trim() ||
      parentId;
    const email = parentProfile?.email?.trim() || profile?.email?.trim() || "";
    const linkedStudentIds = parentToStudents.get(parentId) ?? [];
    return {
      userId: parentId,
      displayName,
      email,
      linkedStudents: linkedStudentIds.map((sid) => ({
        userId: sid,
        displayName: studentNameMap.get(sid) ?? sid,
      })),
    };
  });
}

/** Assignment section/group options for a grade within teacher scope. */
export function assignmentScopeOptionsForGrade(
  context: TeacherContext,
  grade: string,
  subject?: TeachingSubjectType,
): {
  sections: Array<StudentSection | null>;
  groups: Array<IslamicGroup | null>;
} {
  if (context.isLeadTeacher) {
    return {
      sections: [null, ...STUDENT_SECTIONS],
      groups: [null, ...ISLAMIC_GROUPS],
    };
  }

  const matching = context.assignments.filter((assignment) => {
    if (!gradeMatches(assignment.grade, grade)) return false;
    if (subject && assignment.subject_type !== subject) return false;
    return true;
  });
  if (matching.length === 0) {
    return { sections: [], groups: [] };
  }

  const sectionSet = new Set<StudentSection | null>();
  const groupSet = new Set<IslamicGroup | null>();
  for (const a of matching) {
    sectionSet.add(a.section);
    groupSet.add(a.islamic_group);
  }

  return {
    sections: [...sectionSet],
    groups: [...groupSet],
  };
}

export function teacherCanManageGrade(context: TeacherContext, grade: string): boolean {
  const gradeNorm = normalizeGradeSlug(grade) || grade;
  return context.assignedGrades.includes(gradeNorm);
}

export function teacherCanManageLessonScope(
  context: TeacherContext,
  grade: string,
  subject: TeachingSubjectType = DEFAULT_TEACHING_SUBJECT,
): boolean {
  if (context.isLeadTeacher) return true;
  const gradeNorm = normalizeGradeSlug(grade) || grade;
  return context.assignments.some(
    (assignment) =>
      assignment.subject_type === subject &&
      (normalizeGradeSlug(assignment.grade) || assignment.grade) === gradeNorm,
  );
}

export function teacherAssignedGradesForSubject(
  context: TeacherContext,
  subject: TeachingSubjectType,
): string[] {
  if (context.isLeadTeacher) return grades.map((g) => g.slug);
  const slugs = [
    ...new Set(
      context.assignments
        .filter((assignment) => assignment.subject_type === subject)
        .map((assignment) => normalizeGradeSlug(assignment.grade) || assignment.grade)
        .filter(Boolean),
    ),
  ];
  return slugs.sort((a, b) => {
    const ai = grades.findIndex((g) => g.slug === a);
    const bi = grades.findIndex((g) => g.slug === b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export function teacherLessonInScope(
  context: TeacherContext,
  lesson: { grade: string; teachingSubject?: TeachingSubjectType | null },
): boolean {
  if (context.isLeadTeacher) return true;
  const subject = normalizeTeachingSubjectType(lesson.teachingSubject ?? DEFAULT_TEACHING_SUBJECT);
  return context.assignments.some(
    (assignment) =>
      assignment.subject_type === subject &&
      gradeMatches(assignment.grade, lesson.grade),
  );
}

/** Student grade pages: legacy lessons without teaching_subject remain visible (Islamic default). */
export function studentLessonVisibleForGrade(
  lesson: { published: boolean; grade: string; teachingSubject?: TeachingSubjectType | null },
  gradeSlug: string,
): boolean {
  if (!lesson.published) return false;
  return gradeMatches(lesson.grade, gradeSlug);
}
