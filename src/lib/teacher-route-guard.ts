import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { destinationForAccountRole, getAccountRole } from "@/lib/account-role";

export async function requireTeacherRole(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    throw redirect({ to: "/auth", search: { mode: "login" } });
  }
  const role = await getAccountRole(data.user.id);
  if (role !== "teacher") {
    throw redirect({ to: destinationForAccountRole(role) });
  }
}
