import { supabase } from "@/integrations/supabase/client";
import { getAccountRole } from "@/lib/account-role";
import { isBrowser } from "@/lib/runtime";

export type ParentCornerAccess =
  | { kind: "guest" }
  | { kind: "parent"; userId: string }
  | { kind: "student"; userId: string }
  | { kind: "other"; userId: string };

export async function resolveParentCornerAccess(): Promise<ParentCornerAccess> {
  if (!isBrowser()) return { kind: "guest" };

  const { data } = await supabase.auth.getUser();
  if (!data.user) return { kind: "guest" };

  const role = await getAccountRole(data.user.id);
  if (role === "parent") return { kind: "parent", userId: data.user.id };
  if (role === "student") return { kind: "student", userId: data.user.id };
  return { kind: "other", userId: data.user.id };
}

export function parseAuthAccountType(search: Record<string, unknown>): "student" | "parent" | "teacher" {
  const raw = search.accountType ?? search.role ?? search.type;
  if (raw === "parent") return "parent";
  if (raw === "teacher") return "teacher";
  return "student";
}
