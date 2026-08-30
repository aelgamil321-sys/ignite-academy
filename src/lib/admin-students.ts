import { supabase } from "@/integrations/supabase/client";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import { fetchStudentProgress, type StudentProgressData } from "@/lib/student-progress";
import {
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
  isStudentAccount,
} from "@/lib/student-account";

export type AdminStudentDirectoryRow = {
  userId: string;
  englishName: string;
  arabicName: string;
  fullName: string;
  email: string;
  studentLinkCode: string | null;
  gradeSlug: string;
  gradeLabelEn: string;
  gradeLabelAr: string;
  section: StudentSection | null;
  islamicGroup: IslamicGroup | null;
  profilePhotoPath: string | null;
  accountRole: string;
  progressPct: number;
  averageQuizScorePct: number | null;
  certificatesCount: number;
  completedLessons: number;
};

export type AdminStudentParentLink = {
  parentUserId: string;
  parentName: string;
  parentEmail: string;
};

export type AdminStudentDetail = {
  profile: {
    userId: string;
    englishName: string;
    arabicName: string;
    fullName: string;
    email: string;
    studentLinkCode: string | null;
    gradeSlug: string;
    gradeLabelEn: string;
    gradeLabelAr: string;
    section: StudentSection | null;
    islamicGroup: IslamicGroup | null;
    profilePhotoPath: string | null;
    accountRole: string;
    createdAt: string | null;
  };
  progress: StudentProgressData;
  parentLinks: AdminStudentParentLink[];
};

type ProfileRow = {
  user_id: string;
  full_name: string;
  english_name: string;
  arabic_name: string;
  email: string;
  grade: string;
  section: string | null;
  islamic_group: string | null;
  profile_photo_path: string | null;
  parent_link_code: string | null;
  created_at: string;
};

function mapProfileRow(row: ProfileRow, role: string): Omit<AdminStudentDirectoryRow, "progressPct" | "averageQuizScorePct" | "certificatesCount" | "completedLessons"> {
  const gradeSlug = normalizeGradeSlug(row.grade) || row.grade || "";
  return {
    userId: row.user_id,
    englishName: row.english_name?.trim() || row.full_name?.trim() || "—",
    arabicName: row.arabic_name?.trim() || row.full_name?.trim() || "—",
    fullName: row.full_name?.trim() || row.email || "Student",
    email: row.email ?? "",
    studentLinkCode: row.parent_link_code?.trim() || null,
    gradeSlug,
    gradeLabelEn: gradeSlug ? gradeDisplayName(gradeSlug, "en") : "—",
    gradeLabelAr: gradeSlug ? gradeDisplayName(gradeSlug, "ar") : "—",
    section: normalizeStudentSection(row.section),
    islamicGroup: normalizeIslamicGroup(row.islamic_group),
    profilePhotoPath: row.profile_photo_path ?? null,
    accountRole: role,
  };
}

export async function fetchAdminStudentDirectory(): Promise<{
  rows: AdminStudentDirectoryRow[];
  error: string | null;
}> {
  const [profilesRes, rolesRes, submissionsRes, certificatesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "user_id, full_name, english_name, arabic_name, email, grade, section, islamic_group, profile_photo_path, parent_link_code, created_at",
      )
      .order("full_name"),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("lesson_quiz_submissions").select("student_id, lesson_id, percentage, status"),
    supabase.from("quiz_certificates").select("student_id"),
  ]);

  if (profilesRes.error) return { rows: [], error: profilesRes.error.message };
  if (rolesRes.error) return { rows: [], error: rolesRes.error.message };
  if (submissionsRes.error) return { rows: [], error: submissionsRes.error.message };
  if (certificatesRes.error) return { rows: [], error: certificatesRes.error.message };

  const roleIndex = buildUserRoleIndex(rolesRes.data ?? []);

  const studentProfiles = filterProfilesToStudents(
    profilesRes.data ?? [],
    roleIndex,
  ) as ProfileRow[];

  const submissions = submissionsRes.data ?? [];
  const certificates = certificatesRes.data ?? [];

  const gradeLessonCounts = new Map<string, number>();
  const gradeSlugs = [...new Set(studentProfiles.map((p) => normalizeGradeSlug(p.grade) || p.grade).filter(Boolean))];
  if (gradeSlugs.length > 0) {
    const { data: lessonRows } = await supabase
      .from("lessons")
      .select("grade")
      .eq("published", true)
      .in("grade", gradeSlugs);
    for (const slug of gradeSlugs) {
      const count = (lessonRows ?? []).filter((l) => normalizeGradeSlug(l.grade) === slug).length;
      gradeLessonCounts.set(slug, count);
    }
  }

  const rows: AdminStudentDirectoryRow[] = studentProfiles.map((profile) => {
    const base = mapProfileRow(profile, roleIndex.roleByUser.get(profile.user_id) ?? "student");
    const studentSubs = submissions.filter((s) => s.student_id === profile.user_id);
    const reviewed = studentSubs.filter((s) => s.status !== "pending_review");
    const completedLessons = new Set(studentSubs.map((s) => s.lesson_id)).size;
    const totalLessons = gradeLessonCounts.get(base.gradeSlug) ?? 0;
    const progressPct =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 1000) / 10 : 0;
    const averageQuizScorePct =
      reviewed.length > 0
        ? Math.round(
            (reviewed.reduce((sum, s) => sum + Number(s.percentage ?? 0), 0) / reviewed.length) * 10,
          ) / 10
        : null;
    const certificatesCount = certificates.filter((c) => c.student_id === profile.user_id).length;

    return {
      ...base,
      progressPct,
      averageQuizScorePct,
      certificatesCount,
      completedLessons,
    };
  });

  return { rows, error: null };
}

export async function fetchAdminStudentParentLinks(studentUserId: string): Promise<{
  links: AdminStudentParentLink[];
  error: string | null;
}> {
  const [linksRes, parentProfilesRes] = await Promise.all([
    supabase
      .from("parent_student_links")
      .select("parent_user_id")
      .eq("student_user_id", studentUserId),
    supabase.from("parent_profiles").select("user_id, full_name, email"),
  ]);

  if (linksRes.error) return { links: [], error: linksRes.error.message };
  if (parentProfilesRes.error) return { links: [], error: parentProfilesRes.error.message };

  const parentById = new Map(
    (parentProfilesRes.data ?? []).map((row) => [row.user_id, row]),
  );

  const links: AdminStudentParentLink[] = (linksRes.data ?? [])
    .map((link) => {
      const parent = parentById.get(link.parent_user_id);
      if (!parent) return null;
      return {
        parentUserId: parent.user_id,
        parentName: parent.full_name?.trim() || parent.email || "Parent",
        parentEmail: parent.email ?? "",
      };
    })
    .filter((row): row is AdminStudentParentLink => Boolean(row));

  return { links, error: null };
}

export async function fetchAdminStudentDetail(studentUserId: string): Promise<{
  data: AdminStudentDetail | null;
  error: string | null;
}> {
  const [profileRes, rolesRes, progressRes, parentLinksRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "user_id, full_name, english_name, arabic_name, email, grade, section, islamic_group, profile_photo_path, parent_link_code, created_at",
      )
      .eq("user_id", studentUserId)
      .maybeSingle(),
    supabase.from("user_roles").select("user_id, role").eq("user_id", studentUserId),
    fetchStudentProgress(studentUserId),
    fetchAdminStudentParentLinks(studentUserId),
  ]);

  if (profileRes.error) return { data: null, error: profileRes.error.message };
  if (!profileRes.data) return { data: null, error: "Student not found." };
  if (progressRes.error) return { data: null, error: progressRes.error };
  if (!progressRes.data) return { data: null, error: "Progress unavailable." };
  if (parentLinksRes.error) return { data: null, error: parentLinksRes.error };

  const roles = rolesRes.data ?? [];
  const isBlocked = roles.some((row) => row.role === "admin" || row.role === "teacher");
  if (isBlocked) return { data: null, error: "Student not found." };

  const role = roles.find((row) => row.role === "student")?.role ?? roles[0]?.role ?? "student";
  const base = mapProfileRow(profileRes.data as ProfileRow, role);

  return {
    data: {
      profile: {
        ...base,
        createdAt: profileRes.data.created_at ?? null,
      },
      progress: progressRes.data,
      parentLinks: parentLinksRes.links,
    },
    error: null,
  };
}

export const ADMIN_STUDENT_GRADE_OPTIONS = grades.map((g) => g.slug);

export function formatAdminStudentSearchHaystack(row: AdminStudentDirectoryRow): string {
  return [
    row.fullName,
    row.englishName,
    row.arabicName,
    row.email,
    row.userId,
    row.studentLinkCode ?? "",
    row.gradeLabelEn,
    row.gradeLabelAr,
    row.gradeSlug,
    row.section ?? "",
    row.islamicGroup ?? "",
    islamicGroupLabel(row.islamicGroup, "en"),
    islamicGroupLabel(row.islamicGroup, "ar"),
    sectionLabel(row.section, "en"),
    sectionLabel(row.section, "ar"),
  ]
    .join(" ")
    .toLowerCase();
}
