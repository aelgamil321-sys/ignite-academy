import { useEffect, useState } from "react";
import { getAccountRole, type AccountRole } from "@/lib/account-role";
import { supabase } from "@/integrations/supabase/client";

export function useAccountRole() {
  const [role, setRole] = useState<AccountRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async (userId: string | undefined) => {
      if (!userId) {
        if (active) {
          setRole(null);
          setLoading(false);
        }
        return;
      }
      const nextRole = await getAccountRole(userId);
      if (active) {
        setRole(nextRole);
        setLoading(false);
      }
    };

    void supabase.auth.getUser().then(({ data }) => {
      void load(data.user?.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      void load(session?.user?.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    role,
    loading,
    isParent: role === "parent",
    isStudent: role === "student",
    isTeacher: role === "teacher",
    isAdmin: role === "admin",
  };
}
