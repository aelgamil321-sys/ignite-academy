import {
  filterAnalyticsStudents,
  countByStudent,
  buildAdminAnalytics,
  type AdminAnalyticsSnapshot,
  type AnalyticsFilters,
} from "@/lib/admin-analytics";
import type { SubmissionMeta } from "@/lib/khda-analytics-enrichment";
import {
  buildKhdaEnrichment,
  buildStudentScoresFromPerformances,
  type KhdaAnalyticsEnrichment,
} from "@/lib/khda-analytics-enrichment";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_TEACHING_SUBJECT,
  normalizeTeachingSubjectType,
  type TeachingSubjectType,
} from "@/lib/teacher-assignment-subject";
import {
  fetchTeacherAnalytics,
  type TeacherAnalyticsScope,
} from "@/lib/teacher-analytics";
import { fetchAdminAnalytics } from "@/lib/admin-analytics";
import {
  buildUserRoleIndex,
  filterProfilesToStudents,
} from "@/lib/student-account";
import {
  normalizeIslamicGroup,
  normalizeStudentSection,
} from "@/lib/student-academics";
import { normalizeGradeSlug } from "@/lib/grade-utils";

export type KhdaAnalyticsBundle = {
  snapshot: AdminAnalyticsSnapshot;
  enrichment: KhdaAnalyticsEnrichment;
  studentScores: ReturnType<typeof buildStudentScoresFromPerformances>;
};

type SubmissionRow = {
  student_id: string;
  percentage: number;
  submitted_at?: string | null;
  lesson_id?: string | null;
};

function toSubmissionMeta(rows: SubmissionRow[]): SubmissionMeta[] {
  return rows.map((r) => ({
    student_id: r.student_id,
    percentage: r.percentage,
    submitted_at: r.submitted_at ?? null,
    lesson_id: r.lesson_id ?? null,
  }));
}

async function fetchLessonSubjects(lessonIds: string[]): Promise<Map<string, TeachingSubjectType>> {
  const map = new Map<string, TeachingSubjectType>();
  const unique = [...new Set(lessonIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const chunkSize = 200;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const { data } = await supabase.from("lessons").select("id, teaching_subject").in("id", chunk);
    for (const row of data ?? []) {
      map.set(row.id, normalizeTeachingSubjectType(row.teaching_subject) ?? DEFAULT_TEACHING_SUBJECT);
    }
  }
  return map;
}

function buildPerformancesForStudents(
  studentIds: Set<string>,
  submissions: SubmissionMeta[],
  certificateCounts: Map<string, number>,
): Array<{ userId: string; averageScorePct: number | null; submissionCount: number }> {
  const byStudent = new Map<string, number[]>();
  for (const s of submissions) {
    if (!studentIds.has(s.student_id)) continue;
    const bucket = byStudent.get(s.student_id);
    if (bucket) bucket.push(s.percentage);
    else byStudent.set(s.student_id, [s.percentage]);
  }

  return [...studentIds].map((userId) => {
    const percentages = byStudent.get(userId) ?? [];
    return {
      userId,
      averageScorePct:
        percentages.length > 0
          ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length)
          : null,
      submissionCount: percentages.length,
    };
  });
}

export async function buildKhdaBundle(
  snapshot: AdminAnalyticsSnapshot,
  submissionsRaw: SubmissionRow[],
  certificatesRaw: { student_id: string }[],
  filteredStudentIds: Set<string>,
): Promise<KhdaAnalyticsBundle> {
  const submissions = toSubmissionMeta(submissionsRaw).filter((s) =>
    filteredStudentIds.has(s.student_id),
  );
  const filteredCerts = certificatesRaw.filter((c) => filteredStudentIds.has(c.student_id));
  const certificateCounts = countByStudent(filteredCerts);
  const lessonSubjects = await fetchLessonSubjects(
    submissions.map((s) => s.lesson_id).filter((id): id is string => Boolean(id)),
  );

  const perfRows = buildPerformancesForStudents(filteredStudentIds, submissions, certificateCounts);
  const studentScores = buildStudentScoresFromPerformances(perfRows);
  const enrichment = buildKhdaEnrichment(
    snapshot,
    studentScores,
    submissions,
    lessonSubjects,
    filteredStudentIds,
    certificateCounts,
  );

  return { snapshot, enrichment, studentScores };
}

async function loadRawAnalyticsRows(): Promise<{
  submissions: SubmissionRow[];
  certificates: { student_id: string }[];
  error: string | null;
}> {
  const [submissionsRes, certificatesRes] = await Promise.all([
    supabase.from("lesson_quiz_submissions").select("student_id, percentage, submitted_at, lesson_id"),
    supabase.from("quiz_certificates").select("student_id"),
  ]);
  if (submissionsRes.error) return { submissions: [], certificates: [], error: submissionsRes.error.message };
  if (certificatesRes.error) return { submissions: [], certificates: [], error: certificatesRes.error.message };
  return {
    submissions: submissionsRes.data ?? [],
    certificates: certificatesRes.data ?? [],
    error: null,
  };
}

async function loadAllStudents() {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, arabic_name, english_name, profile_photo_path, grade, section, islamic_group"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (rolesRes.error) throw new Error(rolesRes.error.message);
  const roleIndex = buildUserRoleIndex(rolesRes.data ?? []);
  return filterProfilesToStudents(profilesRes.data ?? [], roleIndex);
}

async function buildSnapshotForFilters(
  filters: AnalyticsFilters,
  students: Awaited<ReturnType<typeof loadAllStudents>>,
  raw: { submissions: SubmissionRow[]; certificates: { student_id: string }[] },
): Promise<AdminAnalyticsSnapshot> {
  if (!filters.teachingSubject) {
    return buildAdminAnalytics(students, raw.submissions, raw.certificates, filters);
  }

  const lessonSubjects = await fetchLessonSubjects(
    raw.submissions.map((s) => s.lesson_id).filter((id): id is string => Boolean(id)),
  );
  const subject = normalizeTeachingSubjectType(filters.teachingSubject) ?? DEFAULT_TEACHING_SUBJECT;
  const subjectSubmissions = raw.submissions.filter((row) => {
    const lessonSubject = row.lesson_id
      ? lessonSubjects.get(row.lesson_id) ?? DEFAULT_TEACHING_SUBJECT
      : DEFAULT_TEACHING_SUBJECT;
    return lessonSubject === subject;
  });

  return buildAdminAnalytics(students, subjectSubmissions, raw.certificates, filters);
}

function scopeStudentsForTeacher(
  students: Awaited<ReturnType<typeof loadAllStudents>>,
  scope: TeacherAnalyticsScope,
) {
  if (scope.isLeadTeacher) return students;
  return students.filter((profile) => {
    const section = normalizeStudentSection(profile.section);
    const islamicGroup = normalizeIslamicGroup(profile.islamic_group);
    return scope.assignments.some((assignment) => {
      const g = normalizeGradeSlug(profile.grade);
      const ag = normalizeGradeSlug(assignment.grade);
      if (!g || ag !== g) return false;
      if (assignment.section && section !== assignment.section) return false;
      if (assignment.islamic_group && islamicGroup !== assignment.islamic_group) return false;
      return true;
    });
  });
}

async function filterSubmissionsByTeachingSubject(
  submissions: SubmissionRow[],
  teachingSubject?: string,
): Promise<SubmissionRow[]> {
  if (!teachingSubject) return submissions;
  const lessonSubjects = await fetchLessonSubjects(
    submissions.map((s) => s.lesson_id).filter((id): id is string => Boolean(id)),
  );
  const subject = normalizeTeachingSubjectType(teachingSubject) ?? DEFAULT_TEACHING_SUBJECT;
  return submissions.filter((row) => {
    const lessonSubject = row.lesson_id
      ? lessonSubjects.get(row.lesson_id) ?? DEFAULT_TEACHING_SUBJECT
      : DEFAULT_TEACHING_SUBJECT;
    return lessonSubject === subject;
  });
}

export async function fetchAdminKhdaAnalytics(
  filters: AnalyticsFilters,
): Promise<{ data: KhdaAnalyticsBundle | null; error: string | null }> {
  try {
    const [raw, students] = await Promise.all([loadRawAnalyticsRows(), loadAllStudents()]);
    if (raw.error) return { data: null, error: raw.error };

    let snapshot: AdminAnalyticsSnapshot;
    if (filters.teachingSubject) {
      snapshot = await buildSnapshotForFilters(filters, students, raw);
    } else {
      const result = await fetchAdminAnalytics(filters);
      if (result.error || !result.data) return { data: null, error: result.error };
      snapshot = result.data;
    }

    const filtered = filterAnalyticsStudents(students, filters);
    const ids = new Set(filtered.map((s) => s.user_id));
    const submissionsForBundle = await filterSubmissionsByTeachingSubject(
      raw.submissions,
      filters.teachingSubject,
    );
    const bundle = await buildKhdaBundle(snapshot, submissionsForBundle, raw.certificates, ids);
    return { data: bundle, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Analytics load failed" };
  }
}

export async function fetchTeacherKhdaAnalytics(
  scope: TeacherAnalyticsScope,
  filters: AnalyticsFilters,
): Promise<{ data: KhdaAnalyticsBundle | null; error: string | null }> {
  const result = await fetchTeacherAnalytics(scope, filters);
  if (result.error || !result.data) return { data: null, error: result.error };

  try {
    const [raw, allStudents] = await Promise.all([loadRawAnalyticsRows(), loadAllStudents()]);
    if (raw.error) return { data: null, error: raw.error };
    const scoped = scopeStudentsForTeacher(allStudents, scope);
    const filtered = filterAnalyticsStudents(scoped, filters);
    const ids = new Set(filtered.map((s) => s.user_id));
    const bundle = await buildKhdaBundle(result.data, raw.submissions, raw.certificates, ids);
    return { data: bundle, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Analytics load failed" };
  }
}
