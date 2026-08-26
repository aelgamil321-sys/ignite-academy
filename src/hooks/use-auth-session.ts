import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuthSession() {
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionExists, setSessionExists] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let initialSessionResolved = false;

    const applySession = (hasSession: boolean, uid: string | null, email: string | null) => {
      if (!active) return;
      setSessionExists(hasSession);
      setAuthUserId(uid);
      setAuthEmail(email);
      setAuthLoading(false);
    };

    const clearSession = () => {
      applySession(false, null, null);
      initialSessionResolved = true;
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error("[useAuthSession] getSession failed", error.message);
        clearSession();
        return;
      }
      const session = data.session;
      if (session?.user) {
        applySession(true, session.user.id, session.user.email ?? null);
      } else {
        clearSession();
      }
      initialSessionResolved = true;
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        clearSession();
        return;
      }

      const uid = session?.user?.id;
      if (!uid) {
        if (!initialSessionResolved) return;
        clearSession();
        return;
      }

      applySession(true, uid, session.user.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    authLoading,
    sessionExists,
    authUserId,
    authEmail,
  };
}
