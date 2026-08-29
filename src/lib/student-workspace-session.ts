import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchResolvedAccountRole } from "@/hooks/use-account-role";
import { resolveVerifiedSession } from "@/lib/email-verification";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import {
  normalizeIslamicGroup,
  normalizeStudentSection,
} from "@/lib/student-academics";
import { isStudentProfileComplete } from "@/lib/student-profile";
import type { StudentShellContextValue } from "@/lib/student-shell-context";
import type { AccountRole } from "@/lib/account-role";
import type { Lang } from "@/lib/i18n-config";

export type StudentWorkspaceResolveResult =
  | { status: "anonymous" }
  | { status: "other-role"; role: AccountRole }
  | { status: "unverified"; email: string }
  | { status: "error" }
  | { status: "student"; shell: StudentShellContextValue };

type ShellCache = {
  userId: string;
  lang: Lang;
  shell: StudentShellContextValue;
  resolvedAt: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000;

let shellCache: ShellCache | null = null;

export function peekStudentShell(lang: Lang): StudentShellContextValue | null {
  if (!shellCache || shellCache.lang !== lang) return null;
  if (Date.now() - shellCache.resolvedAt > CACHE_TTL_MS) return null;
  return shellCache.shell;
}

export function setStudentShellCache(
  userId: string,
  lang: Lang,
  shell: StudentShellContextValue,
): void {
  shellCache = { userId, lang, shell, resolvedAt: Date.now() };
}

export function clearStudentShellCache(): void {
  shellCache = null;
}

export function buildStudentShellValue(
  user: User,
  profile: {
    email?: string | null;
    grade?: string | null;
    arabic_name?: string | null;
    english_name?: string | null;
    profile_photo_path?: string | null;
    section?: string | null;
    islamic_group?: string | null;
  } | null,
  lang: Lang,
): StudentShellContextValue {
  const arabicName = profile?.arabic_name?.trim() ?? "";
  const englishName = profile?.english_name?.trim() ?? "";
  const displayName =
    lang === "ar"
      ? arabicName || englishName || user.email || ""
      : englishName || arabicName || user.email || "";
  const rawGrade = profile?.grade?.trim() ?? "";
  const gradeSlug = rawGrade ? normalizeGradeSlug(rawGrade) : "";

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    displayName,
    arabicName,
    englishName,
    profilePhotoPath: profile?.profile_photo_path ?? null,
    gradeSlug,
    hasGrade: Boolean(gradeSlug),
    section: normalizeStudentSection(profile?.section),
    islamicGroup: normalizeIslamicGroup(profile?.islamic_group),
    profileComplete: isStudentProfileComplete(profile),
  };
}

async function fetchStudentProfile(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "email, grade, arabic_name, english_name, profile_photo_path, section, islamic_group",
    )
    .eq("user_id", userId)
    .maybeSingle();
  return profile;
}

export async function resolveStudentWorkspace(lang: Lang): Promise<StudentWorkspaceResolveResult> {
  const session = await resolveVerifiedSession();
  if (session.status === "none") return { status: "anonymous" };
  if (session.status === "unverified") {
    return { status: "unverified", email: session.email };
  }

  const user = session.user;
  const cached = peekStudentShell(lang);
  if (cached && shellCache?.userId === user.id) {
    return { status: "student", shell: cached };
  }

  const resolved = await fetchResolvedAccountRole(user.id);
  if (resolved.error || resolved.role === null) return { status: "error" };
  if (resolved.role !== "student") return { status: "other-role", role: resolved.role };

  const profile = await fetchStudentProfile(user.id);
  const shell = buildStudentShellValue(user, profile, lang);
  setStudentShellCache(user.id, lang, shell);
  return { status: "student", shell };
}

export async function resolveStudentGate(lang: Lang): Promise<StudentWorkspaceResolveResult> {
  return resolveStudentWorkspace(lang);
}
