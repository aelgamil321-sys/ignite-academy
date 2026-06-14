import { supabase } from "@/integrations/supabase/client";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  islamicGroupLabel,
  normalizeIslamicGroup,
  normalizeStudentSection,
  sectionLabel,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";

export const ANALYTICS_UNSET_KEY = "__unset__";

export type AnalyticsFilters = {
  grade: string;
  section: string;
  islamicGroup: string;
};

export type AnalyticsGroupRow = {
  key: string;
  labelEn: string;
  labelAr: string;
  studentCount: number;
  submissionCount: number;
  averageScorePct: number | null;
  certificatesEarned: number;
};

export type AdminAnalyticsSnapshot = {
  byGrade: AnalyticsGroupRow[];
  bySection: AnalyticsGroupRow[];
  byIslamicGroup: AnalyticsGroupRow[];
  summary: {
    studentCount: number;
    submissionCount: number;
    certificateCount: number;
    averageScorePct: number | null;
  };
};

type StudentRow = {
  user_id: string;
  grade: string;
  section: string | null;
  islamic_group: string | null;
};

function averageRounded(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function matchesFilters(student: StudentRow, filters: AnalyticsFilters): boolean {
  if (filters.grade && normalizeGradeSlug(student.grade) !== normalizeGradeSlug(filters.grade)) {
    return false;
  }

  if (filters.section) {
    const section = normalizeStudentSection(student.section);
    if (filters.section === ANALYTICS_UNSET_KEY) {
      if (section !== null) return false;
    } else if (section !== filters.section) {
      return false;
    }
  }

  if (filters.islamicGroup) {
    const group = normalizeIslamicGroup(student.islamic_group);
    if (filters.islamicGroup === ANALYTICS_UNSET_KEY) {
      if (group !== null) return false;
    } else if (group !== filters.islamicGroup) {
      return false;
    }
  }

  return true;
}

function buildGroups(
  filteredStudents: StudentRow[],
  filteredSubmissions: { student_id: string; percentage: number }[],
  filteredCertificates: { student_id: string }[],
  getKey: (student: StudentRow) => string,
  labelFor: (key: string) => { en: string; ar: string },
  sortKeys: (keys: string[]) => string[],
): AnalyticsGroupRow[] {
  const studentsByKey = new Map<string, StudentRow[]>();

  for (const student of filteredStudents) {
    const key = getKey(student);
    const bucket = studentsByKey.get(key);
    if (bucket) bucket.push(student);
    else studentsByKey.set(key, [student]);
  }

  return sortKeys([...studentsByKey.keys()]).map((key) => {
    const groupStudents = studentsByKey.get(key) ?? [];
    const groupIds = new Set(groupStudents.map((student) => student.user_id));
    const groupSubmissions = filteredSubmissions.filter((row) => groupIds.has(row.student_id));
    const groupCertificates = filteredCertificates.filter((row) => groupIds.has(row.student_id));
    const labels = labelFor(key);

    return {
      key,
      labelEn: labels.en,
      labelAr: labels.ar,
      studentCount: groupStudents.length,
      submissionCount: groupSubmissions.length,
      averageScorePct: averageRounded(groupSubmissions.map((row) => row.percentage)),
      certificatesEarned: groupCertificates.length,
    };
  });
}

export function buildAdminAnalytics(
  students: StudentRow[],
  submissions: { student_id: string; percentage: number }[],
  certificates: { student_id: string }[],
  filters: AnalyticsFilters,
): AdminAnalyticsSnapshot {
  const filteredStudents = students.filter((student) => matchesFilters(student, filters));
  const studentIds = new Set(filteredStudents.map((student) => student.user_id));
  const filteredSubmissions = submissions.filter((row) => studentIds.has(row.student_id));
  const filteredCertificates = certificates.filter((row) => studentIds.has(row.student_id));

  const gradeOrder = grades.map((grade) => grade.slug);

  const byGrade = buildGroups(
    filteredStudents,
    filteredSubmissions,
    filteredCertificates,
    (student) => normalizeGradeSlug(student.grade) || ANALYTICS_UNSET_KEY,
    (key) =>
      key === ANALYTICS_UNSET_KEY
        ? { en: "Not set", ar: "غير محدد" }
        : { en: gradeDisplayName(key, "en"), ar: gradeDisplayName(key, "ar") },
    (keys) =>
      [...keys].sort((a, b) => {
        if (a === ANALYTICS_UNSET_KEY) return 1;
        if (b === ANALYTICS_UNSET_KEY) return -1;
        return gradeOrder.indexOf(a) - gradeOrder.indexOf(b);
      }),
  );

  const bySection = buildGroups(
    filteredStudents,
    filteredSubmissions,
    filteredCertificates,
    (student) => normalizeStudentSection(student.section) ?? ANALYTICS_UNSET_KEY,
    (key) =>
      key === ANALYTICS_UNSET_KEY
        ? { en: "Not set", ar: "غير محدد" }
        : {
            en: sectionLabel(key as StudentSection, "en"),
            ar: sectionLabel(key as StudentSection, "ar"),
          },
    (keys) =>
      [...keys].sort((a, b) => {
        if (a === ANALYTICS_UNSET_KEY) return 1;
        if (b === ANALYTICS_UNSET_KEY) return -1;
        return (
          STUDENT_SECTIONS.indexOf(a as StudentSection) -
          STUDENT_SECTIONS.indexOf(b as StudentSection)
        );
      }),
  );

  const byIslamicGroup = buildGroups(
    filteredStudents,
    filteredSubmissions,
    filteredCertificates,
    (student) => normalizeIslamicGroup(student.islamic_group) ?? ANALYTICS_UNSET_KEY,
    (key) =>
      key === ANALYTICS_UNSET_KEY
        ? { en: "Not set", ar: "غير محدد" }
        : {
            en: islamicGroupLabel(key as IslamicGroup, "en"),
            ar: islamicGroupLabel(key as IslamicGroup, "ar"),
          },
    (keys) =>
      [...keys].sort((a, b) => {
        if (a === ANALYTICS_UNSET_KEY) return 1;
        if (b === ANALYTICS_UNSET_KEY) return -1;
        return (
          ISLAMIC_GROUPS.indexOf(a as IslamicGroup) -
          ISLAMIC_GROUPS.indexOf(b as IslamicGroup)
        );
      }),
  );

  return {
    byGrade,
    bySection,
    byIslamicGroup,
    summary: {
      studentCount: filteredStudents.length,
      submissionCount: filteredSubmissions.length,
      certificateCount: filteredCertificates.length,
      averageScorePct: averageRounded(filteredSubmissions.map((row) => row.percentage)),
    },
  };
}

export async function fetchAdminAnalytics(filters: AnalyticsFilters): Promise<{
  data: AdminAnalyticsSnapshot | null;
  error: string | null;
}> {
  const [profilesRes, rolesRes, submissionsRes, certificatesRes] = await Promise.all([
    supabase.from("profiles").select("user_id, grade, section, islamic_group"),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("lesson_quiz_submissions").select("student_id, percentage"),
    supabase.from("quiz_certificates").select("student_id"),
  ]);

  if (profilesRes.error) return { data: null, error: profilesRes.error.message };
  if (rolesRes.error) return { data: null, error: rolesRes.error.message };
  if (submissionsRes.error) return { data: null, error: submissionsRes.error.message };
  if (certificatesRes.error) return { data: null, error: certificatesRes.error.message };

  const adminIds = new Set(
    (rolesRes.data ?? []).filter((row) => row.role === "admin").map((row) => row.user_id),
  );

  const students = (profilesRes.data ?? []).filter((profile) => !adminIds.has(profile.user_id));

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
