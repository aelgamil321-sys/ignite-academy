import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { fetchResolvedAccountRole } from "@/hooks/use-account-role";
import { resolveVerifiedSession } from "@/lib/email-verification";
import type { ParentShellContextValue } from "@/lib/parent-shell-context";
import type { AccountRole } from "@/lib/account-role";
import type { Lang } from "@/lib/i18n-config";

export type ParentWorkspaceResolveResult =
  | { status: "anonymous" }
  | { status: "other-role"; role: AccountRole }
  | { status: "unverified"; email: string }
  | { status: "error" }
  | { status: "parent"; shell: ParentShellContextValue };

type ShellCache = {
  userId: string;
  lang: Lang;
  shell: ParentShellContextValue;
  resolvedAt: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000;

let shellCache: ShellCache | null = null;

export function peekParentShell(lang: Lang): ParentShellContextValue | null {
  if (!shellCache || shellCache.lang !== lang) return null;
  if (Date.now() - shellCache.resolvedAt > CACHE_TTL_MS) return null;
  return shellCache.shell;
}

export function setParentShellCache(
  userId: string,
  lang: Lang,
  shell: ParentShellContextValue,
): void {
  shellCache = { userId, lang, shell, resolvedAt: Date.now() };
}

export function clearParentShellCache(): void {
  shellCache = null;
}

export function buildParentShellValue(
  user: User,
  profile: {
    full_name?: string | null;
    email?: string | null;
  } | null,
): ParentShellContextValue {
  const displayName = profile?.full_name?.trim() || user.email || "";

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    displayName,
  };
}

async function fetchParentProfile(userId: string) {
  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("full_name, email")
    .eq("user_id", userId)
    .maybeSingle();
  return profile;
}

export async function resolveParentWorkspace(lang: Lang): Promise<ParentWorkspaceResolveResult> {
  const session = await resolveVerifiedSession();
  if (session.status === "none") return { status: "anonymous" };
  if (session.status === "unverified") {
    return { status: "unverified", email: session.email };
  }

  const user = session.user;
  const cached = peekParentShell(lang);
  if (cached && shellCache?.userId === user.id) {
    return { status: "parent", shell: cached };
  }

  const resolved = await fetchResolvedAccountRole(user.id);
  if (resolved.error || resolved.role === null) return { status: "error" };
  if (resolved.role !== "parent") return { status: "other-role", role: resolved.role };

  const profile = await fetchParentProfile(user.id);
  const shell = buildParentShellValue(user, profile);
  setParentShellCache(user.id, lang, shell);
  return { status: "parent", shell };
}

export async function resolveParentGate(lang: Lang): Promise<ParentWorkspaceResolveResult> {
  return resolveParentWorkspace(lang);
}
