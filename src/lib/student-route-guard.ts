import { redirect } from "@tanstack/react-router";
import {
  getAccountRole,
  navigateTargetForAccountRole,
  type AccountRole,
} from "@/lib/account-role";
import { supabase } from "@/integrations/supabase/client";
import { requiresEmailVerification } from "@/lib/email-verification";
import { gradeMatches, normalizeGradeSlug } from "@/lib/grade-utils";
import { isBrowser } from "@/lib/runtime";
import {
  normalizeIslamicGroup,
  normalizeStudentSection,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";

export type StudentProfileScope = {
  userId: string;
  gradeSlug: string;
  section: StudentSection | null;
  islamicGroup: IslamicGroup | null;
};

export type AuthenticatedSessionContext =
  | { userId: string; role: AccountRole }
  | { userId: null; role: null };

export async function getAuthenticatedSessionContext(): Promise<AuthenticatedSessionContext> {
  if (!isBrowser()) return { userId: null, role: null };

  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return { userId: null, role: null };

  if (requiresEmailVerification(user)) {
    throw redirect({ to: "/auth", search: { mode: "login" } });
  }

  const role = await getAccountRole(user.id);
  if (!role) {
    throw redirect({ to: "/" });
  }

  return { userId: user.id, role };
}

export async function fetchStudentProfileScope(userId: string): Promise<StudentProfileScope | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("grade, section, islamic_group")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profile?.grade) return null;

  const gradeSlug = normalizeGradeSlug(profile.grade);
  if (!gradeSlug) return null;

  return {
    userId,
    gradeSlug,
    section: normalizeStudentSection(profile.section),
    islamicGroup: normalizeIslamicGroup(profile.islamic_group),
  };
}

/** Block legacy public unit CMS for everyone except admins (who use the admin route). */
export async function guardPublicUnitCmsRoute(gradeSlug: string, unitSlug: string): Promise<void> {
  const ctx = await getAuthenticatedSessionContext();

  if (!ctx.userId) {
    throw redirect({ to: "/grades/$grade", params: { grade: gradeSlug } });
  }

  if (ctx.role === "admin") {
    throw redirect({
      to: "/admin/grades/$grade/units/$unit",
      params: { grade: gradeSlug, unit: unitSlug },
    });
  }

  throw redirect(navigateTargetForAccountRole(ctx.role));
}

/** Authenticated students may only open their own grade catalog. */
export async function enforceStudentOwnGradeCatalog(): Promise<void> {
  const ctx = await getAuthenticatedSessionContext();
  if (!ctx.userId || ctx.role !== "student") return;

  const scope = await fetchStudentProfileScope(ctx.userId);
  if (scope?.gradeSlug) {
    throw redirect({ to: "/grades/$grade", params: { grade: scope.gradeSlug } });
  }

  throw redirect({ to: "/student" });
}

/** Authenticated students may only open their own grade page. */
export async function enforceStudentOwnGradeInUrl(requestedGrade: string): Promise<void> {
  const ctx = await getAuthenticatedSessionContext();
  if (!ctx.userId || ctx.role !== "student") return;

  const scope = await fetchStudentProfileScope(ctx.userId);
  if (!scope?.gradeSlug) {
    throw redirect({ to: "/student" });
  }

  if (!gradeMatches(requestedGrade, scope.gradeSlug)) {
    throw redirect({ to: "/grades/$grade", params: { grade: scope.gradeSlug } });
  }
}

/** Authenticated students may only open lessons in their own grade. */
export async function enforceStudentOwnGradeLesson(
  requestedGrade: string,
  lessonSlug: string,
): Promise<void> {
  await enforceStudentOwnGradeInUrl(requestedGrade);

  const ctx = await getAuthenticatedSessionContext();
  if (!ctx.userId || ctx.role !== "student") return;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("grade")
    .eq("id", lessonSlug)
    .maybeSingle();

  if (lesson?.grade) {
    const scope = await fetchStudentProfileScope(ctx.userId);
    if (scope && !gradeMatches(lesson.grade, scope.gradeSlug)) {
      throw redirect({ to: "/grades/$grade", params: { grade: scope.gradeSlug } });
    }
  }
}

/** Redirect authenticated students away from legacy client-only quiz pages. */
export async function redirectStudentLegacyQuizRoute(slug: string): Promise<void> {
  const ctx = await getAuthenticatedSessionContext();
  if (!ctx.userId || ctx.role !== "student") return;

  const scope = await fetchStudentProfileScope(ctx.userId);
  const ownGrade = scope?.gradeSlug;

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, grade, published")
    .eq("id", slug)
    .maybeSingle();

  if (lesson?.published && lesson.grade && gradeMatches(lesson.grade, ownGrade ?? lesson.grade)) {
    throw redirect({
      to: "/grades/$grade/$lesson",
      params: { grade: normalizeGradeSlug(lesson.grade), lesson: lesson.id },
    });
  }

  if (ownGrade) {
    throw redirect({ to: "/grades/$grade", params: { grade: ownGrade } });
  }

  throw redirect({ to: "/student" });
}

/** Redirect authenticated students from the all-grades quiz catalog to their grade lessons. */
export async function redirectStudentQuizCatalog(): Promise<void> {
  const ctx = await getAuthenticatedSessionContext();
  if (!ctx.userId || ctx.role !== "student") return;

  const scope = await fetchStudentProfileScope(ctx.userId);
  if (scope?.gradeSlug) {
    throw redirect({ to: "/grades/$grade", params: { grade: scope.gradeSlug } });
  }

  throw redirect({ to: "/student" });
}

export function studentOwnGradePath(gradeSlug: string | null | undefined): string {
  return gradeSlug ? `/grades/${gradeSlug}` : "/student/profile";
}
