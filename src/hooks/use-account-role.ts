import { useEffect, useState } from "react";
import {
  queryUserRolesDirect,
  resolveRoleFromRows,
  type AccountRole,
} from "@/lib/account-role";
import { supabase } from "@/integrations/supabase/client";

export type HomeVariant =
  | "public"
  | "loading"
  | "error"
  | "student"
  | "teacher"
  | "parent"
  | "admin";

export function useAccountRole() {
  const [sessionReady, setSessionReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [rawUserRoles, setRawUserRoles] = useState<string[]>([]);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleQueryError, setRoleQueryError] = useState<string | null>(null);
  const [roleQueryStatus, setRoleQueryStatus] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let sessionResolved = false;

    const loadRoleForUser = async (uid: string, userEmail: string | undefined) => {
      if (!active) return;
      setUserId(uid);
      setEmail(userEmail ?? null);
      setRoleLoading(true);
      setRoleQueryError(null);
      setRoleQueryStatus(null);
      setRawUserRoles([]);
      setRole(null);

      const direct = await queryUserRolesDirect(uid);
      if (!active) return;

      setRawUserRoles(direct.rawRoles);
      setRoleQueryStatus(direct.status);

      if (direct.error) {
        setRoleQueryError(direct.error);
        setRole(null);
        setRoleLoading(false);
        return;
      }

      const resolved = resolveRoleFromRows(direct.data);
      setRole(resolved);

      if (resolved === null) {
        setRoleQueryError(
          direct.rawRoles.length === 0
            ? "user_roles SELECT returned [] (no row visible to client — check RLS or Supabase project)"
            : `unrecognized roles: ${direct.rawRoles.join(", ")}`,
        );
      }

      setRoleLoading(false);
    };

    const clearRole = () => {
      if (!active) return;
      setUserId(null);
      setEmail(null);
      setRole(null);
      setRawUserRoles([]);
      setRoleQueryError(null);
      setRoleQueryStatus(null);
      setRoleLoading(false);
      setSessionReady(true);
      sessionResolved = true;
    };

    void supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      setSessionReady(true);
      const uid = session?.user?.id;
      if (uid) void loadRoleForUser(uid, session?.user?.email);
      else clearRole();
      sessionResolved = true;
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearRole();
        return;
      }

      const uid = session?.user?.id;
      if (!uid) {
        if (!sessionResolved) return;
        clearRole();
        return;
      }

      setSessionReady(true);
      void loadRoleForUser(uid, session.user.email);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const roleUnresolved =
    sessionReady && userId !== null && !roleLoading && role === null;

  return {
    sessionReady,
    userId,
    email,
    role,
    rawUserRoles,
    roleLoading,
    roleQueryError,
    roleQueryStatus,
    roleUnresolved,
    isParent: role === "parent",
    isStudent: role === "student",
    isTeacher: role === "teacher",
    isAdmin: role === "admin",
  };
}

export function resolveHomeVariant(
  signedIn: boolean,
  roleLoading: boolean,
  role: AccountRole | null,
  roleQueryError: string | null,
  roleUnresolved: boolean,
): HomeVariant {
  if (!signedIn) return "public";
  if (roleLoading) return "loading";
  if (roleQueryError || roleUnresolved) return "error";
  if (role === "teacher") return "teacher";
  if (role === "parent") return "parent";
  if (role === "admin") return "admin";
  if (role === "student") return "student";
  return "error";
}

/** One-shot role fetch for route guards (reuses direct query). */
export async function fetchResolvedAccountRole(userId: string): Promise<{
  role: AccountRole | null;
  rawUserRoles: string[];
  error: string | null;
  status: number | null;
}> {
  const direct = await queryUserRolesDirect(userId);
  if (direct.error) {
    return { role: null, rawUserRoles: direct.rawRoles, error: direct.error, status: direct.status };
  }
  return {
    role: resolveRoleFromRows(direct.data),
    rawUserRoles: direct.rawRoles,
    error: null,
    status: direct.status,
  };
}
