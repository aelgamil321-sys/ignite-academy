import { supabase } from "@/integrations/supabase/client";

export type AccountRole = "parent" | "student" | "admin" | "teacher";

const ROLE_QUERY_BACKOFF_MS = [0, 75, 150, 300];

function resolveRoleFromRows(
  rows: ReadonlyArray<{ role: string }> | null | undefined,
): AccountRole | null {
  const roleList = (rows ?? []).map((row) => row.role);
  if (roleList.includes("admin")) return "admin";
  if (roleList.includes("parent")) return "parent";
  if (roleList.includes("teacher")) return "teacher";
  if (roleList.includes("student")) return "student";
  return null;
}

/** Resolve role from public.user_roles only (never profiles / metadata). */
export async function getAccountRole(userId: string): Promise<AccountRole | null> {
  if (!userId) return null;

  let lastRows: { role: string }[] | null = null;

  for (let attempt = 0; attempt < ROLE_QUERY_BACKOFF_MS.length; attempt++) {
    const delayMs = ROLE_QUERY_BACKOFF_MS[attempt];
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error) {
      console.error("[getAccountRole] role lookup failed", error.message);
      return null;
    }

    lastRows = data;
    const resolved = resolveRoleFromRows(data);
    if (resolved !== null) return resolved;
  }

  return resolveRoleFromRows(lastRows);
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
