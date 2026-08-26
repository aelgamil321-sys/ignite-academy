import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isSupabaseAuthStorageKeyPresent,
  readLoginSessionDebugSnapshot,
  type LoginSessionDebugSnapshot,
} from "@/lib/supabase-auth-storage";

const TRACKED_AUTH_EVENTS = new Set([
  "INITIAL_SESSION",
  "SIGNED_IN",
  "SIGNED_OUT",
  "TOKEN_REFRESHED",
]);

export function useAuthSession() {
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionExists, setSessionExists] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authEvents, setAuthEvents] = useState<string[]>([]);
  const [authStorageKeyPresent, setAuthStorageKeyPresent] = useState(false);
  const [loginSnapshot, setLoginSnapshot] = useState<LoginSessionDebugSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    let initialSessionResolved = false;

    setLoginSnapshot(readLoginSessionDebugSnapshot());

    const applySession = (hasSession: boolean, uid: string | null, email: string | null) => {
      if (!active) return;
      setSessionExists(hasSession);
      setAuthUserId(uid);
      setAuthEmail(email);
      setAuthStorageKeyPresent(isSupabaseAuthStorageKeyPresent());
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

      if (TRACKED_AUTH_EVENTS.has(event)) {
        setAuthEvents((prev) => [...prev.slice(-7), event]);
      }

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
    authEvents,
    authStorageKeyPresent,
    loginSnapshot,
  };
}
