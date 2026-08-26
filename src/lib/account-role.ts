import { supabase } from "@/integrations/supabase/client";

export type AccountRole = "parent" | "student" | "admin" | "teacher";

const ROLE_QUERY_BACKOFF_MS = [0, 75, 150, 300];

export type UserRolesQueryResult = {
  data: { role: string }[] | null;
  rawRoles: string[];
  error: string | null;
  status: number | null;
};

export function resolveRoleFromRows(
  rows: ReadonlyArray<{ role: string }> | null | undefined,
): AccountRole | null {
  const roleList = (rows ?? []).map((row) => row.role);
  if (roleList.includes("admin")) return "admin";
  if (roleList.includes("parent")) return "parent";
  if (roleList.includes("teacher")) return "teacher";
  if (roleList.includes("student")) return "student";
  return null;
}

/** Direct browser query against public.user_roles (for diagnostics + role resolution). */
export async function queryUserRolesDirect(userId: string): Promise<UserRolesQueryResult> {
  const { data, error, status } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  return {
    data,
    rawRoles: (data ?? []).map((row) => row.role),
    error: error?.message ?? null,
    status: status ?? (error as { status?: number } | null)?.status ?? null,
  };
}

/** Resolve role from public.user_roles only (never profiles / metadata). */
export async function getAccountRole(userId: string): Promise<AccountRole | null> {
  if (!userId) return null;

  let lastResult: UserRolesQueryResult | null = null;

  for (let attempt = 0; attempt < ROLE_QUERY_BACKOFF_MS.length; attempt++) {
    const delayMs = ROLE_QUERY_BACKOFF_MS[attempt];
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const result = await queryUserRolesDirect(userId);
    lastResult = result;

    if (result.error) {
      console.error("[getAccountRole] role lookup failed", result.error);
      return null;
    }

    const resolved = resolveRoleFromRows(result.data);
    if (resolved !== null) return resolved;
  }

  return resolveRoleFromRows(lastResult?.data);
}

export async function isParentAccount(userId: string): Promise<boolean> {
  return (await getAccountRole(userId)) === "parent";
}

export function destinationForAccountRole(role: AccountRole | null): string {
  if (role === "parent") return "/parent/dashboard";
  if (role === "teacher") return "/";
  if (role === "admin") return "/admin";
  if (role === "student") return "/student";
  return "/auth";
}

export function postAuthPathForRole(role: AccountRole | null): string {
  return destinationForAccountRole(role);
}

export async function getPostAuthPath(userId: string): Promise<string> {
  const role = await getAccountRole(userId);
  return postAuthPathForRole(role);
}

export function supabaseProjectHost(): string {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  try {
    return url ? new URL(url).host : "missing";
  } catch {
    return "invalid-url";
  }
}
