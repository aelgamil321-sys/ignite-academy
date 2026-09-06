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
import {
  buildUserRoleIndex,
  filterProfilesToStudents,
} from "@/lib/student-account";

export const ANALYTICS_UNSET_KEY = "__unset__";
export const AT_RISK_SCORE_THRESHOLD = 60;
export const TOP_STUDENTS_LIMIT = 25;
export const TOP_SECTIONS_LIMIT = 10;

export type AnalyticsFilters = {
  grade: string;
  section: string;
  islamicGroup: string;
  teachingSubject?: string;
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

export type StudentLeaderboardRow = {
  rank: number;
  userId: string;
  arabicName: string;
  englishName: string;
  profilePhotoPath: string | null;
  gradeSlug: string;
  gradeLabelEn: string;
  gradeLabelAr: string;
  section: StudentSection | null;
  islamicGroup: IslamicGroup | null;
  averageScorePct: number | null;
  certificatesEarned: number;
};

export type SectionLeaderboardRow = {
  rank: number;
  section: StudentSection | null;
  labelEn: string;
  labelAr: string;
  studentCount: number;
  averageScorePct: number | null;
  certificatesEarned: number;
};

export type IslamicGroupCard = {
  group: IslamicGroup;
  labelEn: string;
  labelAr: string;
  studentCount: number;
  averageScorePct: number | null;
  certificatesEarned: number;
};

export type LeadingInsightItem = {
  labelEn: string;
  labelAr: string;
  averageScorePct: number;
};

export type LeadingInsights = {
  grade: LeadingInsightItem | null;
  section: LeadingInsightItem | null;
  islamicGroup: LeadingInsightItem | null;
};

export type AtRiskStudentRow = {
  userId: string;
  nameEn: string;
  nameAr: string;
  gradeLabelEn: string;
  gradeLabelAr: string;
  section: StudentSection | null;
  islamicGroup: IslamicGroup | null;
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
  topStudents: StudentLeaderboardRow[];
  topSections: SectionLeaderboardRow[];
  islamicGroupCards: IslamicGroupCard[];
  leading: LeadingInsights;
  atRiskStudents: AtRiskStudentRow[];
};

type StudentRow = {
  user_id: string;
  full_name: string;
  arabic_name: string;
  english_name: string;
  profile_photo_path: string | null;
  grade: string;
  section: string | null;
  islamic_group: string | null;
};

type StudentPerformance = {
  student: StudentRow;
  averageScorePct: number | null;
  certificatesEarned: number;
  submissionCount: number;
};

function averageRounded(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function filterAnalyticsStudents(
  students: StudentRow[],
  filters: AnalyticsFilters,
): StudentRow[] {
  return students.filter((student) => matchesFilters(student, filters));
}

export function countByStudent<T extends { student_id: string }>(rows: T[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1);
  }
  return counts;
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

function computeStudentPerformance(
  filteredStudents: StudentRow[],
  filteredSubmissions: { student_id: string; percentage: number }[],
  certificateCounts: Map<string, number>,
): StudentPerformance[] {
  const submissionsByStudent = new Map<string, number[]>();

  for (const submission of filteredSubmissions) {
    const bucket = submissionsByStudent.get(submission.student_id);
    if (bucket) bucket.push(submission.percentage);
    else submissionsByStudent.set(submission.student_id, [submission.percentage]);
  }

  return filteredStudents.map((student) => {
    const percentages = submissionsByStudent.get(student.user_id) ?? [];
    return {
      student,
      averageScorePct: averageRounded(percentages),
      certificatesEarned: certificateCounts.get(student.user_id) ?? 0,
      submissionCount: percentages.length,
    };
  });
}

function pickBestGroup(rows: AnalyticsGroupRow[]): LeadingInsightItem | null {
  const eligible = rows.filter(
    (row) =>
      row.key !== ANALYTICS_UNSET_KEY &&
      row.studentCount > 0 &&
      row.averageScorePct !== null,
  );

  if (eligible.length === 0) return null;

  const best = [...eligible].sort((a, b) => {
    if (b.averageScorePct! !== a.averageScorePct!) {
      return b.averageScorePct! - a.averageScorePct!;
    }
    return b.certificatesEarned - a.certificatesEarned;
  })[0];

  return {
    labelEn: best.labelEn,
    labelAr: best.labelAr,
    averageScorePct: best.averageScorePct!,
  };
}

function buildTopStudents(performances: StudentPerformance[]): StudentLeaderboardRow[] {
  const ranked = [...performances]
    .filter((row) => row.submissionCount > 0 && row.averageScorePct !== null)
    .sort((a, b) => {
      if (b.averageScorePct! !== a.averageScorePct!) {
        return b.averageScorePct! - a.averageScorePct!;
      }
      if (b.certificatesEarned !== a.certificatesEarned) {
        return b.certificatesEarned - a.certificatesEarned;
      }
      return b.submissionCount - a.submissionCount;
    })
    .slice(0, TOP_STUDENTS_LIMIT);

  return ranked.map((row, index) => {
    const gradeSlug = normalizeGradeSlug(row.student.grade) || ANALYTICS_UNSET_KEY;
    return {
      rank: index + 1,
      userId: row.student.user_id,
      arabicName:
        row.student.arabic_name?.trim() ||
        row.student.full_name?.trim() ||
        row.student.english_name?.trim() ||
        "—",
      englishName:
        row.student.english_name?.trim() ||
        row.student.full_name?.trim() ||
        row.student.arabic_name?.trim() ||
        "—",
      profilePhotoPath: row.student.profile_photo_path,
      gradeSlug,
      gradeLabelEn:
        gradeSlug === ANALYTICS_UNSET_KEY
          ? "Not set"
          : gradeDisplayName(gradeSlug, "en"),
      gradeLabelAr:
        gradeSlug === ANALYTICS_UNSET_KEY
          ? "غير محدد"
          : gradeDisplayName(gradeSlug, "ar"),
      section: normalizeStudentSection(row.student.section),
      islamicGroup: normalizeIslamicGroup(row.student.islamic_group),
      averageScorePct: row.averageScorePct,
      certificatesEarned: row.certificatesEarned,
    };
  });
}

function buildTopSections(bySection: AnalyticsGroupRow[]): SectionLeaderboardRow[] {
  const ranked = [...bySection]
    .filter(
      (row) =>
        row.key !== ANALYTICS_UNSET_KEY &&
        row.studentCount > 0 &&
        row.averageScorePct !== null,
    )
    .sort((a, b) => {
      if (b.averageScorePct! !== a.averageScorePct!) {
        return b.averageScorePct! - a.averageScorePct!;
      }
      return b.certificatesEarned - a.certificatesEarned;
    })
    .slice(0, TOP_SECTIONS_LIMIT);

  return ranked.map((row, index) => ({
    rank: index + 1,
    section: row.key as StudentSection,
    labelEn: row.labelEn,
    labelAr: row.labelAr,
    studentCount: row.studentCount,
    averageScorePct: row.averageScorePct,
    certificatesEarned: row.certificatesEarned,
  }));
}

function buildIslamicGroupCards(byIslamicGroup: AnalyticsGroupRow[]): IslamicGroupCard[] {
  const rowByKey = new Map(byIslamicGroup.map((row) => [row.key, row]));

  return ISLAMIC_GROUPS.map((group) => {
    const row = rowByKey.get(group);
    return {
      group,
      labelEn: islamicGroupLabel(group, "en"),
      labelAr: islamicGroupLabel(group, "ar"),
      studentCount: row?.studentCount ?? 0,
      averageScorePct: row?.averageScorePct ?? null,
      certificatesEarned: row?.certificatesEarned ?? 0,
    };
  });
}

/** Evidence-based: submissions required; certificates alone never trigger attention. */
export function studentNeedsAttention(performance: {
  submissionCount: number;
  averageScorePct: number | null;
}): boolean {
  return (
    performance.submissionCount > 0 &&
    performance.averageScorePct !== null &&
    performance.averageScorePct < AT_RISK_SCORE_THRESHOLD
  );
}

function buildAtRiskStudents(performances: StudentPerformance[]): AtRiskStudentRow[] {
  return performances
    .filter((row) => studentNeedsAttention(row))
    .sort((a, b) => {
      const aScore = a.averageScorePct ?? -1;
      const bScore = b.averageScorePct ?? -1;
      if (aScore !== bScore) return aScore - bScore;
      return a.certificatesEarned - b.certificatesEarned;
    })
    .map((row) => {
      const gradeSlug = normalizeGradeSlug(row.student.grade) || ANALYTICS_UNSET_KEY;
      return {
        userId: row.student.user_id,
        nameEn:
          row.student.english_name?.trim() ||
          row.student.full_name?.trim() ||
          row.student.arabic_name?.trim() ||
          "—",
        nameAr:
          row.student.arabic_name?.trim() ||
          row.student.full_name?.trim() ||
          row.student.english_name?.trim() ||
          "—",
        gradeLabelEn:
          gradeSlug === ANALYTICS_UNSET_KEY
            ? "Not set"
            : gradeDisplayName(gradeSlug, "en"),
        gradeLabelAr:
          gradeSlug === ANALYTICS_UNSET_KEY
            ? "غير محدد"
            : gradeDisplayName(gradeSlug, "ar"),
        section: normalizeStudentSection(row.student.section),
        islamicGroup: normalizeIslamicGroup(row.student.islamic_group),
        averageScorePct: row.averageScorePct,
        certificatesEarned: row.certificatesEarned,
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
  const certificateCounts = countByStudent(filteredCertificates);
  const performances = computeStudentPerformance(
    filteredStudents,
    filteredSubmissions,
    certificateCounts,
  );

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
    topStudents: buildTopStudents(performances),
    topSections: buildTopSections(bySection),
    islamicGroupCards: buildIslamicGroupCards(byIslamicGroup),
    leading: {
      grade: pickBestGroup(byGrade),
      section: pickBestGroup(bySection),
      islamicGroup: pickBestGroup(byIslamicGroup),
    },
    atRiskStudents: buildAtRiskStudents(performances),
  };
}

export async function fetchAdminAnalytics(filters: AnalyticsFilters): Promise<{
  data: AdminAnalyticsSnapshot | null;
  error: string | null;
}> {
  const [profilesRes, rolesRes, submissionsRes, certificatesRes] = await Promise.all([
    supabase.from("profiles").select(
      "user_id, full_name, arabic_name, english_name, profile_photo_path, grade, section, islamic_group",
    ),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("lesson_quiz_submissions").select("student_id, percentage, submitted_at, lesson_id"),
    supabase.from("quiz_certificates").select("student_id"),
  ]);

  if (profilesRes.error) return { data: null, error: profilesRes.error.message };
  if (rolesRes.error) return { data: null, error: rolesRes.error.message };
  if (submissionsRes.error) return { data: null, error: submissionsRes.error.message };
  if (certificatesRes.error) return { data: null, error: certificatesRes.error.message };

  const roleIndex = buildUserRoleIndex(rolesRes.data ?? []);
  const students = filterProfilesToStudents(profilesRes.data ?? [], roleIndex);

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
