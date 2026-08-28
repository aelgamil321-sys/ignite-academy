import { supabase } from "@/integrations/supabase/client";
import { fetchStudentProgress } from "@/lib/student-progress";
import { normalizeGradeSlug, gradeDisplayName } from "@/lib/grade-utils";
import {
  islamicGroupLabel,
  normalizeIslamicGroup,
  normalizeStudentSection,
  sectionLabel,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";

export type AdminParentDirectoryChild = {
  studentUserId: string;
  fullName: string;
  gradeSlug: string;
  gradeLabelEn: string;
  gradeLabelAr: string;
  section: StudentSection | null;
  islamicGroup: IslamicGroup | null;
  profilePhotoPath: string | null;
  averageQuizScorePct: number | null;
  overallProgressPct: number | null;
};

export type AdminParentDirectoryRow = {
  parentUserId: string;
  parentName: string;
  parentEmail: string;
  children: AdminParentDirectoryChild[];
};

type ProfileRow = {
  user_id: string;
  full_name: string;
  email: string;
  grade: string;
  section: string | null;
  islamic_group: string | null;
  profile_photo_path: string | null;
};

function mapChild(profile: ProfileRow): AdminParentDirectoryChild {
  const gradeSlug = normalizeGradeSlug(profile.grade) || profile.grade;
  return {
    studentUserId: profile.user_id,
    fullName: profile.full_name?.trim() || profile.email || "Student",
    gradeSlug,
    gradeLabelEn: gradeDisplayName(gradeSlug, "en"),
    gradeLabelAr: gradeDisplayName(gradeSlug, "ar"),
    section: normalizeStudentSection(profile.section),
    islamicGroup: normalizeIslamicGroup(profile.islamic_group),
    profilePhotoPath: profile.profile_photo_path ?? null,
    averageQuizScorePct: null,
    overallProgressPct: null,
  };
}

async function attachChildProgress(children: AdminParentDirectoryChild[]): Promise<AdminParentDirectoryChild[]> {
  return Promise.all(
    children.map(async (child) => {
      const { data } = await fetchStudentProgress(child.studentUserId);
      return {
        ...child,
        averageQuizScorePct: data?.averageQuizScorePct ?? null,
        overallProgressPct: data?.overallProgressPct ?? null,
      };
    }),
  );
}

export async function fetchAdminParentDirectory(): Promise<{
  rows: AdminParentDirectoryRow[];
  error: string | null;
}> {
  const [parentProfilesRes, rolesRes, linksRes, profilesRes] = await Promise.all([
    supabase.from("parent_profiles").select("user_id, full_name, email").order("full_name"),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("parent_student_links").select("parent_user_id, student_user_id"),
    supabase
      .from("profiles")
      .select("user_id, full_name, email, grade, section, islamic_group, profile_photo_path"),
  ]);

  if (parentProfilesRes.error) return { rows: [], error: parentProfilesRes.error.message };
  if (rolesRes.error) return { rows: [], error: rolesRes.error.message };
  if (linksRes.error) return { rows: [], error: linksRes.error.message };
  if (profilesRes.error) return { rows: [], error: profilesRes.error.message };

  const parentIds = new Set(
    (rolesRes.data ?? []).filter((row) => row.role === "parent").map((row) => row.user_id),
  );
  const adminIds = new Set(
    (rolesRes.data ?? []).filter((row) => row.role === "admin").map((row) => row.user_id),
  );

  const profileById = new Map(
    (profilesRes.data ?? []).map((row) => [row.user_id, row as ProfileRow]),
  );

  const childrenByParent = new Map<string, string[]>();
  for (const link of linksRes.data ?? []) {
    const list = childrenByParent.get(link.parent_user_id) ?? [];
    list.push(link.student_user_id);
    childrenByParent.set(link.parent_user_id, list);
  }

  const rows: AdminParentDirectoryRow[] = (parentProfilesRes.data ?? [])
    .filter((parent) => parentIds.has(parent.user_id))
    .map((parent) => {
      const childIds = childrenByParent.get(parent.user_id) ?? [];
      const children = childIds
        .map((id) => profileById.get(id))
        .filter((profile): profile is ProfileRow => Boolean(profile) && !adminIds.has(profile.user_id))
        .map((profile) => mapChild(profile));

      return {
        parentUserId: parent.user_id,
        parentName: parent.full_name?.trim() || parent.email || "Parent",
        parentEmail: parent.email ?? "",
        children,
      };
    })
    .filter((row) => row.parentName || row.parentEmail);

  const rowsWithProgress = await Promise.all(
    rows.map(async (row) => ({
      ...row,
      children: await attachChildProgress(row.children),
    })),
  );

  return { rows: rowsWithProgress, error: null };
}

export function formatChildAcademics(
  child: AdminParentDirectoryChild,
  lang: "en" | "ar",
): string {
  const parts = [
    lang === "ar" ? child.gradeLabelAr : child.gradeLabelEn,
    sectionLabel(child.section, lang),
    islamicGroupLabel(child.islamicGroup, lang),
  ].filter((part) => part && part !== "—");
  return parts.join(" · ");
}
