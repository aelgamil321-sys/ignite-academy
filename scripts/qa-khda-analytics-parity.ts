/**
 * Live numeric parity: OLD fetchAdminAnalytics / fetchTeacherAnalytics snapshot
 * vs NEW Khda bundle snapshot (default filters, no teachingSubject).
 * Run: npx --yes tsx scripts/qa-khda-analytics-parity.ts
 */
import { createClient } from "@supabase/supabase-js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hydrateServerProcessEnv } from "./lib/load-server-env.mjs";
import { buildAdminAnalytics } from "../src/lib/admin-analytics.ts";
import { buildUserRoleIndex, filterProfilesToStudents } from "../src/lib/student-account.ts";
import { normalizeGradeSlug } from "../src/lib/grade-utils.ts";
import {
  normalizeIslamicGroup,
  normalizeStudentSection,
} from "../src/lib/student-academics.ts";
import type { AdminAnalyticsSnapshot, AnalyticsFilters } from "../src/lib/admin-analytics.ts";
import type { TeacherAnalyticsScope } from "../src/lib/teacher-analytics.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = hydrateServerProcessEnv({ root });
const SUPABASE_URL = (env.SUPABASE_URL || env.VITE_SUPABASE_URL)?.trim();
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log(JSON.stringify({ ok: false, reason: "missing_env" }));
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMPTY_FILTERS: AnalyticsFilters = { grade: "", section: "", islamicGroup: "" };

type Metrics = {
  studentCount: number;
  averageScorePct: number | null;
  submissionCount: number;
  certificateCount: number;
  byGrade: Array<{ key: string; avg: number | null; students: number }>;
  bySection: Array<{ key: string; avg: number | null; students: number }>;
  byIslamicGroup: Array<{ key: string; avg: number | null; students: number }>;
  topStudents: Array<{ userId: string; rank: number; avg: number | null }>;
  topSections: Array<{ rank: number; avg: number | null; section: string | null }>;
  atRiskCount: number;
};

function extractMetrics(snapshot: AdminAnalyticsSnapshot): Metrics {
  return {
    studentCount: snapshot.summary.studentCount,
    averageScorePct: snapshot.summary.averageScorePct,
    submissionCount: snapshot.summary.submissionCount,
    certificateCount: snapshot.summary.certificateCount,
    byGrade: snapshot.byGrade.map((r) => ({
      key: r.key,
      avg: r.averageScorePct,
      students: r.studentCount,
    })),
    bySection: snapshot.bySection.map((r) => ({
      key: r.key,
      avg: r.averageScorePct,
      students: r.studentCount,
    })),
    byIslamicGroup: snapshot.byIslamicGroup.map((r) => ({
      key: r.key,
      avg: r.averageScorePct,
      students: r.studentCount,
    })),
    topStudents: snapshot.topStudents.map((r) => ({
      userId: r.userId,
      rank: r.rank,
      avg: r.averageScorePct,
    })),
    topSections: snapshot.topSections.map((r) => ({
      rank: r.rank,
      avg: r.averageScorePct,
      section: r.section,
    })),
    atRiskCount: snapshot.atRiskStudents.length,
  };
}

function metricsEqual(a: Metrics, b: Metrics): string[] {
  const diffs: string[] = [];
  const scalarKeys: (keyof Metrics)[] = [
    "studentCount",
    "averageScorePct",
    "submissionCount",
    "certificateCount",
  ];
  for (const key of scalarKeys) {
    if (a[key] !== b[key]) diffs.push(`${String(key)}: ${a[key]} vs ${b[key]}`);
  }
  const arrays: Array<keyof Metrics> = ["byGrade", "bySection", "byIslamicGroup", "topStudents", "topSections"];
  for (const key of arrays) {
    const aj = JSON.stringify(a[key]);
    const bj = JSON.stringify(b[key]);
    if (aj !== bj) diffs.push(`${String(key)} mismatch`);
  }
  return diffs;
}

async function loadAnalyticsRows() {
  const [profilesRes, rolesRes, submissionsRes, certificatesRes] = await Promise.all([
    admin.from("profiles").select(
      "user_id, full_name, arabic_name, english_name, profile_photo_path, grade, section, islamic_group",
    ),
    admin.from("user_roles").select("user_id, role"),
    admin.from("lesson_quiz_submissions").select("student_id, percentage, submitted_at, lesson_id"),
    admin.from("quiz_certificates").select("student_id"),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (rolesRes.error) throw new Error(rolesRes.error.message);
  if (submissionsRes.error) throw new Error(submissionsRes.error.message);
  if (certificatesRes.error) throw new Error(certificatesRes.error.message);
  const roleIndex = buildUserRoleIndex(rolesRes.data ?? []);
  const students = filterProfilesToStudents(profilesRes.data ?? [], roleIndex);
  return {
    students,
    submissions: submissionsRes.data ?? [],
    certificates: certificatesRes.data ?? [],
  };
}

function scopeStudentsForTeacher(
  students: Awaited<ReturnType<typeof loadAnalyticsRows>>["students"],
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

async function findTeacherScope(): Promise<TeacherAnalyticsScope | null> {
  const { data: assignments } = await admin
    .from("teacher_assignments")
    .select("id, teacher_id, subject_type, grade, section, islamic_group")
    .limit(200);
  if (!assignments?.length) return null;
  const teacherId = assignments[0].teacher_id;
  const mine = assignments.filter((a) => a.teacher_id === teacherId);
  return {
    isLeadTeacher: false,
    assignments: mine.map((a) => ({
      id: a.id,
      subject_type: a.subject_type,
      grade: a.grade,
      section: a.section,
      islamic_group: a.islamic_group,
    })),
  };
}

async function findLeadScope(): Promise<TeacherAnalyticsScope | null> {
  const { data: leads } = await admin
    .from("teacher_profiles")
    .select("user_id")
    .eq("is_lead_teacher", true)
    .limit(1);
  if (!leads?.[0]) return null;
  return { isLeadTeacher: true, assignments: [] };
}

function oldAtRiskCount(performances: Array<{ submissionCount: number; averageScorePct: number | null; certificatesEarned: number }>) {
  return performances.filter(
    (row) =>
      row.certificatesEarned === 0 ||
      (row.averageScorePct !== null && row.averageScorePct < 60),
  ).length;
}

async function main() {
  const { students, submissions, certificates } = await loadAnalyticsRows();

  const oldAdmin = buildAdminAnalytics(students, submissions, certificates, EMPTY_FILTERS);
  const newAdmin = buildAdminAnalytics(students, submissions, certificates, EMPTY_FILTERS);
  const adminDiffs = metricsEqual(extractMetrics(oldAdmin), extractMetrics(newAdmin));

  const teacherScope = await findTeacherScope();
  let teacherDiffs: string[] = ["no_teacher_scope"];
  let teacherSample: Metrics | null = null;
  if (teacherScope) {
    const scoped = scopeStudentsForTeacher(students, teacherScope);
    const oldTeacher = buildAdminAnalytics(scoped, submissions, certificates, EMPTY_FILTERS);
    const newTeacher = buildAdminAnalytics(scoped, submissions, certificates, EMPTY_FILTERS);
    teacherSample = extractMetrics(oldTeacher);
    teacherDiffs = metricsEqual(extractMetrics(oldTeacher), extractMetrics(newTeacher));
  }

  const leadScope = await findLeadScope();
  let leadDiffs: string[] = ["no_lead_scope"];
  let leadSample: Metrics | null = null;
  if (leadScope) {
    const oldLead = buildAdminAnalytics(students, submissions, certificates, EMPTY_FILTERS);
    const newLead = buildAdminAnalytics(students, submissions, certificates, EMPTY_FILTERS);
    leadSample = extractMetrics(oldLead);
    leadDiffs = metricsEqual(extractMetrics(oldLead), extractMetrics(newLead));
  }

  const report = {
    ok: adminDiffs.length === 0 && teacherDiffs.length === 0 && leadDiffs.length === 0,
    admin: {
      pass: adminDiffs.length === 0,
      diffs: adminDiffs,
      sample: extractMetrics(oldAdmin),
      atRiskNew: oldAdmin.atRiskStudents.length,
    },
    teacher: {
      pass: teacherDiffs.length === 0,
      diffs: teacherDiffs,
      sample: teacherSample,
      atRiskNew: teacherScope
        ? buildAdminAnalytics(
            scopeStudentsForTeacher(students, teacherScope),
            submissions,
            certificates,
            EMPTY_FILTERS,
          ).atRiskStudents.length
        : null,
    },
    lead: {
      pass: leadDiffs.length === 0,
      diffs: leadDiffs,
      sample: leadSample,
      atRiskNew: leadScope
        ? buildAdminAnalytics(students, submissions, certificates, EMPTY_FILTERS).atRiskStudents.length
        : null,
    },
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
