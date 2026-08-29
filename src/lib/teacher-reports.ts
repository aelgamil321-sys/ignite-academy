import type { AdminAnalyticsSnapshot, AtRiskStudentRow, StudentLeaderboardRow } from "@/lib/admin-analytics";
import { AT_RISK_SCORE_THRESHOLD } from "@/lib/admin-analytics";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import type { Lang } from "@/lib/i18n-config";
import type { ScopedStudentRow, TeacherContext } from "@/lib/teacher-dashboard";
import {
  studentMatchesClassFilter,
  teacherReportGradeOptions,
  teacherReportSectionOptions,
} from "@/lib/teacher-dashboard";
import { islamicGroupLabel, sectionLabel, STUDENT_SECTIONS, type IslamicGroup, type StudentSection } from "@/lib/student-academics";

export type ReportTimeRange = "all" | "30d" | "90d";

export type ReportEvidenceItem = {
  labelKey: string;
  value: string;
};

export type ClassReportData = {
  grade: string;
  gradeLabel: string;
  studentCount: number;
  averageScorePct: number | null;
  studentsWithScores: number;
  atRiskCount: number;
  topStudents: StudentLeaderboardRow[];
  followUpStudents: AtRiskStudentRow[];
  strengths: ReportEvidenceItem[];
  needsSupport: ReportEvidenceItem[];
};

export type SectionReportData = {
  grade: string;
  section: StudentSection;
  gradeLabel: string;
  sectionLabel: string;
  studentCount: number;
  averageScorePct: number | null;
  studentsWithScores: number;
  atRiskCount: number;
  topStudents: StudentLeaderboardRow[];
  followUpStudents: AtRiskStudentRow[];
  strengths: ReportEvidenceItem[];
  needsSupport: ReportEvidenceItem[];
};

export type StudentReportData = {
  student: ScopedStudentRow;
  gradeLabel: string;
  sectionLabel: string;
  groupLabel: string;
  strengths: ReportEvidenceItem[];
  needsSupport: ReportEvidenceItem[];
};

function filterStudentsByGrade(students: ScopedStudentRow[], grade: string): ScopedStudentRow[] {
  const slug = normalizeGradeSlug(grade);
  return students.filter((s) => normalizeGradeSlug(s.grade) === slug);
}

function filterStudentsBySection(
  students: ScopedStudentRow[],
  grade: string,
  section: StudentSection,
): ScopedStudentRow[] {
  return filterStudentsByGrade(students, grade).filter((s) => s.section === section);
}

function averageScore(students: ScopedStudentRow[]): number | null {
  const scored = students.filter((s) => s.avgQuizScore !== null);
  if (scored.length === 0) return null;
  const sum = scored.reduce((acc, s) => acc + (s.avgQuizScore ?? 0), 0);
  return Math.round(sum / scored.length);
}

function buildEvidenceForGroup(
  students: ScopedStudentRow[],
  topStudents: StudentLeaderboardRow[],
  followUpStudents: AtRiskStudentRow[],
): { strengths: ReportEvidenceItem[]; needsSupport: ReportEvidenceItem[] } {
  const strengths: ReportEvidenceItem[] = [];
  const needsSupport: ReportEvidenceItem[] = [];

  const avg = averageScore(students);
  if (avg !== null) {
    strengths.push({ labelKey: "teacher_report_metric_avg_score", value: `${avg}%` });
  }

  const top = topStudents[0];
  if (top?.averageScorePct !== null && top.averageScorePct !== undefined) {
    strengths.push({
      labelKey: "teacher_report_strength_top_score",
      value: `${top.averageScorePct}%`,
    });
  }

  const withActivity = students.filter((s) => s.avgQuizScore !== null).length;
  strengths.push({
    labelKey: "teacher_report_metric_quiz_activity",
    value: String(withActivity),
  });

  const atRisk = followUpStudents.length;
  if (atRisk > 0) {
    needsSupport.push({
      labelKey: "teacher_report_support_at_risk_count",
      value: String(atRisk),
    });
  }

  const belowThreshold = students.filter(
    (s) => s.avgQuizScore !== null && s.avgQuizScore < AT_RISK_SCORE_THRESHOLD,
  ).length;
  if (belowThreshold > 0) {
    needsSupport.push({
      labelKey: "teacher_report_support_below_threshold",
      value: String(belowThreshold),
    });
  }

  const noScores = students.filter((s) => s.avgQuizScore === null).length;
  if (noScores > 0) {
    needsSupport.push({
      labelKey: "teacher_report_support_no_quiz_data",
      value: String(noScores),
    });
  }

  return { strengths, needsSupport };
}

export function buildClassReport(
  grade: string,
  students: ScopedStudentRow[],
  snapshot: AdminAnalyticsSnapshot | null,
  lang: Lang,
): ClassReportData {
  const scoped = filterStudentsByGrade(students, grade);
  const gradeRow = snapshot?.byGrade.find((r) => normalizeGradeSlug(r.key) === normalizeGradeSlug(grade));
  const scopedIds = new Set(scoped.map((s) => s.userId));
  const topStudents =
    snapshot?.topStudents.filter(
      (r) => scopedIds.has(r.userId) || normalizeGradeSlug(r.gradeSlug) === normalizeGradeSlug(grade),
    ) ?? [];
  const followUpStudents = snapshot?.atRiskStudents.filter((r) => scopedIds.has(r.userId)) ?? [];

  const evidence = buildEvidenceForGroup(scoped, topStudents, followUpStudents);

  return {
    grade,
    gradeLabel: gradeDisplayName(grade, lang),
    studentCount: scoped.length,
    averageScorePct: gradeRow?.averageScorePct ?? averageScore(scoped),
    studentsWithScores: scoped.filter((s) => s.avgQuizScore !== null).length,
    atRiskCount: followUpStudents.length,
    topStudents: topStudents.slice(0, 10),
    followUpStudents: followUpStudents.slice(0, 10),
    strengths: evidence.strengths,
    needsSupport: evidence.needsSupport,
  };
}

export function buildSectionReport(
  grade: string,
  section: StudentSection,
  students: ScopedStudentRow[],
  snapshot: AdminAnalyticsSnapshot | null,
  lang: Lang,
): SectionReportData {
  const scoped = filterStudentsBySection(students, grade, section);
  const sectionRow = snapshot?.bySection.find((r) => r.key === section);
  const scopedIds = new Set(scoped.map((s) => s.userId));
  const topStudents =
    snapshot?.topStudents.filter(
      (r) =>
        scopedIds.has(r.userId) ||
        (normalizeGradeSlug(r.gradeSlug) === normalizeGradeSlug(grade) && r.section === section),
    ) ?? [];
  const followUpStudents = snapshot?.atRiskStudents.filter((r) => scopedIds.has(r.userId)) ?? [];

  const evidence = buildEvidenceForGroup(scoped, topStudents, followUpStudents);

  return {
    grade,
    section,
    gradeLabel: gradeDisplayName(grade, lang),
    sectionLabel: sectionLabel(section, lang),
    studentCount: scoped.length,
    averageScorePct: sectionRow?.averageScorePct ?? averageScore(scoped),
    studentsWithScores: scoped.filter((s) => s.avgQuizScore !== null).length,
    atRiskCount: followUpStudents.length,
    topStudents: topStudents.slice(0, 10),
    followUpStudents: followUpStudents.slice(0, 10),
    strengths: evidence.strengths,
    needsSupport: evidence.needsSupport,
  };
}

export function buildStudentReport(
  studentId: string,
  students: ScopedStudentRow[],
  lang: Lang,
): StudentReportData | null {
  const student = students.find((s) => s.userId === studentId);
  if (!student) return null;

  const strengths: ReportEvidenceItem[] = [];
  const needsSupport: ReportEvidenceItem[] = [];

  if (student.avgQuizScore !== null) {
    strengths.push({
      labelKey: "teacher_report_metric_avg_score",
      value: `${student.avgQuizScore}%`,
    });
  }
  if (student.completedLessons > 0) {
    strengths.push({
      labelKey: "teacher_report_strength_lessons_completed",
      value: String(student.completedLessons),
    });
  }
  if (student.certificatesCount > 0) {
    strengths.push({
      labelKey: "teacher_report_strength_certificates",
      value: String(student.certificatesCount),
    });
  }

  if (student.avgQuizScore === null) {
    needsSupport.push({
      labelKey: "teacher_report_support_no_quiz_data",
      value: "1",
    });
  } else if (student.avgQuizScore < AT_RISK_SCORE_THRESHOLD) {
    needsSupport.push({
      labelKey: "teacher_report_support_below_threshold",
      value: `${student.avgQuizScore}%`,
    });
  }
  if (student.progressPct < 25) {
    needsSupport.push({
      labelKey: "teacher_report_support_low_progress",
      value: `${student.progressPct}%`,
    });
  }

  return {
    student,
    gradeLabel: gradeDisplayName(student.grade, lang),
    sectionLabel: student.section ? sectionLabel(student.section, lang) : "—",
    groupLabel: student.islamic_group ? islamicGroupLabel(student.islamic_group, lang) : "—",
    strengths,
    needsSupport,
  };
}

export function uniqueGradesFromStudents(students: ScopedStudentRow[]): string[] {
  return [...new Set(students.map((s) => normalizeGradeSlug(s.grade) || s.grade))].sort();
}

export function uniqueSectionsForGrade(
  students: ScopedStudentRow[],
  grade: string,
): StudentSection[] {
  const sections = filterStudentsByGrade(students, grade)
    .map((s) => s.section)
    .filter(Boolean) as StudentSection[];
  return [...new Set(sections)].sort(
    (a, b) => STUDENT_SECTIONS.indexOf(a) - STUDENT_SECTIONS.indexOf(b),
  );
}

/** @deprecated Use teacherReportSectionOptions — assignments are the source of truth for report scope. */
export function uniqueSectionsForTeacherGrade(
  context: TeacherContext,
  _students: ScopedStudentRow[],
  grade: string,
): StudentSection[] {
  return teacherReportSectionOptions(context, grade);
}

export function filterStudentsInScope(
  students: ScopedStudentRow[],
  grade: string,
  section?: StudentSection | "",
  islamicGroup?: IslamicGroup | "",
): ScopedStudentRow[] {
  return students.filter((s) =>
    studentMatchesClassFilter(s, {
      grade,
      section: section || "",
      islamic_group: islamicGroup || "",
    }),
  );
}

export type TeacherReportFilterSelections = {
  grade: string;
  section: StudentSection | "";
  studentId: string;
};

export type ResolvedTeacherReportFilters = {
  gradeOptions: string[];
  effectiveGrade: string;
  sectionOptions: StudentSection[];
  effectiveSection: StudentSection | "";
  studentsForGrade: ScopedStudentRow[];
  studentsForSection: ScopedStudentRow[];
  studentOptions: ScopedStudentRow[];
  effectiveStudentId: string;
};

/** Render-safe cascade: grade → section → student. Never returns stale invalid selections. */
export function resolveTeacherReportFilters(
  context: TeacherContext | null,
  students: ScopedStudentRow[],
  selections: TeacherReportFilterSelections,
): ResolvedTeacherReportFilters {
  const gradeOptions = context ? teacherReportGradeOptions(context) : [];
  const effectiveGrade =
    selections.grade && gradeOptions.includes(selections.grade)
      ? selections.grade
      : (gradeOptions[0] ?? "");

  const sectionOptions =
    context && effectiveGrade ? teacherReportSectionOptions(context, effectiveGrade) : [];

  const effectiveSection: StudentSection | "" =
    selections.section && sectionOptions.includes(selections.section)
      ? selections.section
      : (sectionOptions[0] ?? "");

  const studentsForGrade = effectiveGrade
    ? filterStudentsInScope(students, effectiveGrade)
    : [];

  const studentsForSection =
    effectiveGrade && effectiveSection
      ? filterStudentsInScope(students, effectiveGrade, effectiveSection)
      : [];

  const studentOptions = studentsForGrade;

  const effectiveStudentId =
    selections.studentId && studentOptions.some((s) => s.userId === selections.studentId)
      ? selections.studentId
      : (studentOptions[0]?.userId ?? "");

  return {
    gradeOptions,
    effectiveGrade,
    sectionOptions,
    effectiveSection,
    studentsForGrade,
    studentsForSection,
    studentOptions,
    effectiveStudentId,
  };
}

function isValidStudentSection(value: string): value is StudentSection {
  return (STUDENT_SECTIONS as readonly string[]).includes(value);
}

export function safeBuildClassReport(
  grade: string,
  students: ScopedStudentRow[],
  snapshot: AdminAnalyticsSnapshot | null,
  lang: Lang,
): ClassReportData | null {
  if (!grade) return null;
  try {
    return buildClassReport(grade, students, snapshot, lang);
  } catch {
    return null;
  }
}

export function safeBuildSectionReport(
  grade: string,
  section: StudentSection | "",
  students: ScopedStudentRow[],
  snapshot: AdminAnalyticsSnapshot | null,
  lang: Lang,
): SectionReportData | null {
  if (!grade || !section || !isValidStudentSection(section)) return null;
  try {
    return buildSectionReport(grade, section, students, snapshot, lang);
  } catch {
    return null;
  }
}

export function safeBuildStudentReport(
  studentId: string,
  students: ScopedStudentRow[],
  lang: Lang,
): StudentReportData | null {
  if (!studentId) return null;
  try {
    return buildStudentReport(studentId, students, lang);
  } catch {
    return null;
  }
}
