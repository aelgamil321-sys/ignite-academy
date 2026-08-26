import { supabase } from "@/integrations/supabase/client";
import { grades } from "@/lib/curriculum";
import { normalizeGradeSlug } from "@/lib/grade-utils";
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

export type TeacherAssignmentScope = {
  id: string;
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

export async function fetchTeacherContext(userId: string): Promise<TeacherContext> {
  const [assignmentsRes, requestRes, teacherProfileRes] = await Promise.all([
    supabase.from("teacher_assignments").select("*").eq("teacher_id", userId).order("grade"),
    supabase
      .from("teacher_requests")
      .select("full_name, email")
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
    grade: row.grade,
    section: normalizeStudentSection(row.section),
    islamic_group: normalizeIslamicGroup(row.islamic_group),
  }));

  const assignedGrades = isLeadTeacher
    ? grades.map((g) => g.slug)
    : [...new Set(assignments.map((a) => normalizeGradeSlug(a.grade) || a.grade))];

  const profileRes = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", userId)
    .maybeSingle();

  const fullName =
    requestRes.data?.full_name ||
    profileRes.data?.full_name ||
    requestRes.data?.email ||
    profileRes.data?.email ||
    userId;
  const email = requestRes.data?.email || profileRes.data?.email || "";

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
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, arabic_name, english_name, grade, section, islamic_group");

  if (error) throw error;

  const students = (profiles ?? []).map((p) => ({
    userId: p.user_id,
    displayName:
      (p.english_name?.trim() || p.arabic_name?.trim() || p.full_name?.trim() || p.user_id) ?? p.user_id,
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
): {
  sections: Array<StudentSection | null>;
  groups: Array<IslamicGroup | null>;
} {
  const gradeNorm = normalizeGradeSlug(grade) || grade;
  if (context.isLeadTeacher) {
    return {
      sections: [null, ...STUDENT_SECTIONS],
      groups: [null, ...ISLAMIC_GROUPS],
    };
  }

  const matching = context.assignments.filter(
    (a) => normalizeGradeSlug(a.grade) === gradeNorm || a.grade === gradeNorm,
  );
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
