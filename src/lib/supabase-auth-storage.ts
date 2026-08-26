import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const LOGIN_DEBUG_KEY = "auth-debug-login";

/** Supabase localStorage key pattern: sb-<project-ref>-auth-token */
export function getSupabaseAuthStorageKey(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  if (!url || typeof window === "undefined") return null;
  try {
    const ref = new URL(url).hostname.split(".")[0];
    return `sb-${ref}-auth-token`;
  } catch {
    return null;
  }
}

export function isSupabaseAuthStorageKeyPresent(): boolean {
  if (typeof window === "undefined") return false;
  const expected = getSupabaseAuthStorageKey();
  if (expected && window.localStorage.getItem(expected) !== null) return true;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith("sb-") && key.endsWith("-auth-token")) return true;
  }
  return false;
}

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

export type LoginSessionDebugSnapshot = {
  label: string;
  timestamp: number;
  sessionExists: boolean;
  authUserId: string | null;
  authEmail: string | null;
  authStorageKeyPresent: boolean;
};

export async function recordLoginSessionDebug(label: string): Promise<LoginSessionDebugSnapshot> {
  const { data } = await supabase.auth.getSession();
  const snapshot: LoginSessionDebugSnapshot = {
    label,
    timestamp: Date.now(),
    sessionExists: !!data.session?.user,
    authUserId: data.session?.user?.id ?? null,
    authEmail: data.session?.user?.email ?? null,
    authStorageKeyPresent: isSupabaseAuthStorageKeyPresent(),
  };
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(LOGIN_DEBUG_KEY, JSON.stringify(snapshot));
    } catch {
      /* ignore quota / privacy mode */
    }
  }
  return snapshot;
}

export function readLoginSessionDebugSnapshot(): LoginSessionDebugSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LOGIN_DEBUG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LoginSessionDebugSnapshot;
  } catch {
    return null;
  }
}
