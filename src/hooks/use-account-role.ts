import { useEffect, useState } from "react";
import { getAccountRole, type AccountRole } from "@/lib/account-role";
import { supabase } from "@/integrations/supabase/client";

export function useAccountRole() {
  const [role, setRole] = useState<AccountRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let sessionResolved = false;

    const loadRole = async (uid: string) => {
      if (!active) return;
      setUserId(uid);
      setLoading(true);
      const nextRole = await getAccountRole(uid);
      if (!active) return;
      setRole(nextRole);
      setLoading(false);
      sessionResolved = true;
    };

    const clearRole = () => {
      if (!active) return;
      setUserId(null);
      setRole(null);
      setLoading(false);
      sessionResolved = true;
    };

    void supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (uid) void loadRole(uid);
      else clearRole();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearRole();
        return;
      }

      const uid = session?.user?.id;
      if (!uid) {
        // Ignore transient empty sessions before the initial getSession() resolves.
        if (!sessionResolved) return;
        clearRole();
        return;
      }

      void loadRole(uid);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    role,
    userId,
    loading,
    isParent: role === "parent",
    isStudent: role === "student",
    isTeacher: role === "teacher",
    isAdmin: role === "admin",
  };
}
