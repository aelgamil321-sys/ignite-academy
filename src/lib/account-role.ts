import { supabase } from "@/integrations/supabase/client";

export type AccountRole = "parent" | "student" | "admin" | "teacher";

export async function getAccountRole(userId: string): Promise<AccountRole | null> {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("[getAccountRole] role lookup failed", error.message);
    return null;
  }

  const roleList = (roles ?? []).map((row) => row.role);
  if (roleList.includes("admin")) return "admin";
  if (roleList.includes("parent")) return "parent";
  if (roleList.includes("teacher")) return "teacher";
  if (roleList.includes("student")) return "student";
  return null;
}

export async function isParentAccount(userId: string): Promise<boolean> {
  return (await getAccountRole(userId)) === "parent";
}

export function postAuthPathForRole(role: AccountRole | null): string {
  if (role === "parent") return "/parent/dashboard";
  if (role === "teacher") return "/teacher";
  return "/student";
}

export async function getPostAuthPath(userId: string): Promise<string> {
  const role = await getAccountRole(userId);
  return postAuthPathForRole(role);
}
