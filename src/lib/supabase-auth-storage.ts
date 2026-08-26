import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

/** Persist session to client storage before a hard navigation. */
export async function ensureSessionPersisted(session: Session | null): Promise<boolean> {
  if (session) {
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) {
      console.error("[auth] setSession after login failed", error.message);
    }
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[auth] getSession after login failed", error.message);
    return false;
  }
  return !!data.session?.user;
}
