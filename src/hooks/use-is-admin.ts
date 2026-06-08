import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.error("[useIsAdmin] role lookup failed", error.message);
    return false;
  }
  return (roles ?? []).some((r) => r.role === "admin");
}

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      if (!session?.user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }

      const admin = await fetchIsAdmin(session.user.id);
      if (!active) return;
      setIsAdmin(admin);
      setChecking(false);
    };

    void check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session?.user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }
      void (async () => {
        const admin = await fetchIsAdmin(session.user.id);
        if (!active) return;
        setIsAdmin(admin);
        setChecking(false);
      })();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, checking };
}
