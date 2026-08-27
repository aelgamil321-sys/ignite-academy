import { redirect } from "@tanstack/react-router";
import { destinationForAccountRole } from "@/lib/account-role";
import { fetchResolvedAccountRole } from "@/hooks/use-account-role";
import { supabase } from "@/integrations/supabase/client";
import { requiresEmailVerification } from "@/lib/email-verification";
import { isBrowser } from "@/lib/runtime";

export const PARENT_DASHBOARD_PATH = "/parent/dashboard";
export const TEACHER_DASHBOARD_PATH = "/teacher";

/** Redirect non-student accounts away from student learning routes and dashboards. */
export async function blockParentFromStudentRoutes(): Promise<void> {
  // Supabase browser auth uses localStorage — defer to client gates after hydration.
  if (!isBrowser()) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return;

  if (requiresEmailVerification(user)) {
    throw redirect({ to: "/auth", search: { mode: "login" } });
  }

  const resolved = await fetchResolvedAccountRole(user.id);
  if (resolved.role === "student") return;

  if (resolved.error || resolved.role === null) {
    throw redirect({ to: "/" });
  }

  throw redirect({ to: destinationForAccountRole(resolved.role) });
}
