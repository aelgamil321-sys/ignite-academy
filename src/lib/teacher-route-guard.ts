import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { destinationForAccountRole, getAccountRole } from "@/lib/account-role";
import { requiresEmailVerification } from "@/lib/email-verification";
import { isBrowser } from "@/lib/runtime";

export async function requireTeacherRole(): Promise<void> {
  // Supabase browser auth uses localStorage — defer to TeacherGate after hydration.
  if (!isBrowser()) return;

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    throw redirect({ to: "/auth", search: { mode: "login" } });
  }
  if (requiresEmailVerification(data.user)) {
    throw redirect({ to: "/auth", search: { mode: "login" } });
  }
  const role = await getAccountRole(data.user.id);
  if (role !== "teacher") {
    throw redirect({ to: destinationForAccountRole(role) });
  }
}
