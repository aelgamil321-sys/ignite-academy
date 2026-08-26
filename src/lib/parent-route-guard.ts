import { redirect } from "@tanstack/react-router";
import { destinationForAccountRole, getAccountRole } from "@/lib/account-role";
import { supabase } from "@/integrations/supabase/client";

export const PARENT_DASHBOARD_PATH = "/parent/dashboard";
export const TEACHER_DASHBOARD_PATH = "/teacher";

/** Redirect non-student accounts away from student learning routes and dashboards. */
export async function blockParentFromStudentRoutes(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return;

  const role = await getAccountRole(user.id);
  if (role === "student") return;

  throw redirect({ to: destinationForAccountRole(role) });
}
