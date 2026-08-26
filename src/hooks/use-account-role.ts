import { useEffect, useState } from "react";
import {
  queryUserRolesDirect,
  resolveRoleFromRows,
  type AccountRole,
} from "@/lib/account-role";
import { useAuthSession } from "@/hooks/use-auth-session";

export type HomeVariant =
  | "public"
  | "loading"
  | "error"
  | "student"
  | "teacher"
  | "parent"
  | "admin";

export function useAccountRole() {
  const {
    authLoading,
    sessionExists,
    authUserId,
    authEmail,
    authEvents,
    authStorageKeyPresent,
    loginSnapshot,
  } = useAuthSession();

  const [role, setRole] = useState<AccountRole | null>(null);
  const [rawUserRoles, setRawUserRoles] = useState<string[]>([]);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleQueryError, setRoleQueryError] = useState<string | null>(null);
  const [roleQueryStatus, setRoleQueryStatus] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    if (authLoading) {
      setRoleLoading(true);
      return;
    }

    if (!sessionExists || !authUserId) {
      setRole(null);
      setRawUserRoles([]);
      setRoleQueryError(null);
      setRoleQueryStatus(null);
      setRoleLoading(false);
      return;
    }

    const loadRoleForUser = async (uid: string) => {
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

    void loadRoleForUser(authUserId);

    return () => {
      active = false;
    };
  }, [authLoading, sessionExists, authUserId]);

  const roleUnresolved =
    sessionExists && authUserId !== null && !authLoading && !roleLoading && role === null;

  return {
    authLoading,
    sessionExists,
    authUserId,
    authEmail,
    authEvents,
    authStorageKeyPresent,
    loginSnapshot,
    sessionReady: !authLoading,
    userId: authUserId,
    email: authEmail,
    role,
    rawUserRoles,
    roleLoading: authLoading || (sessionExists && roleLoading),
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
