import { redirect } from "@tanstack/react-router";
import { getAccountRole } from "@/lib/account-role";
import { supabase } from "@/integrations/supabase/client";

export const PARENT_DASHBOARD_PATH = "/parent/dashboard";

/** Redirect signed-in parents away from student learning routes. */
export async function blockParentFromStudentRoutes(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  const role = await getAccountRole(data.user.id);
  if (role === "parent") {
    throw redirect({ to: PARENT_DASHBOARD_PATH });
  }
}
