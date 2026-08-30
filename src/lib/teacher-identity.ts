import { supabase } from "@/integrations/supabase/client";

export type TeacherIdentitySource = {
  full_name?: string | null;
  english_name?: string | null;
  arabic_name?: string | null;
  email?: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Never show a raw UUID as a user-facing teacher name. */
export function isUuidLike(value: string | null | undefined): boolean {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 && UUID_RE.test(trimmed);
}

export function emailLocalPartFallback(email: string | null | undefined): string | null {
  const trimmed = (email ?? "").trim();
  if (!trimmed.includes("@")) return null;
  const local = trimmed.split("@")[0]?.trim();
  return local || null;
}

/**
 * Centralized teacher display-name resolution.
 * Priority: profile names → email local-part → em dash (never UUID).
 */
export function resolveTeacherDisplayName(
  userId: string,
  source: TeacherIdentitySource = {},
  rpcName?: string | null,
): string {
  const fromRpc = (rpcName ?? "").trim();
  if (fromRpc && fromRpc !== "—" && !isUuidLike(fromRpc)) return fromRpc;

  const candidates = [
    source.full_name,
    source.english_name,
    source.arabic_name,
    emailLocalPartFallback(source.email),
  ];

  for (const candidate of candidates) {
    const trimmed = (candidate ?? "").trim();
    if (trimmed && !isUuidLike(trimmed)) return trimmed;
  }

  return "—";
}

/**
 * Secure batch lookup for teacher/admin display names (authorized RPC).
 * Falls back silently when RPC is unavailable (e.g. migration not yet applied).
 */
export async function fetchTeacherDisplayNames(
  userIds: string[],
): Promise<Record<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const { data, error } = await supabase.rpc("get_teacher_display_names", {
    p_user_ids: ids,
  });

  if (error) {
    console.warn("fetchTeacherDisplayNames failed", error.message);
    return {};
  }

  const payload = (data ?? {}) as Record<string, string>;
  const map: Record<string, string> = {};
  for (const [userId, name] of Object.entries(payload)) {
    const trimmed = (name ?? "").trim();
    if (trimmed && trimmed !== "—" && !isUuidLike(trimmed)) {
      map[userId] = trimmed;
    }
  }
  return map;
}

export async function fetchTeacherDisplayName(userId: string): Promise<string> {
  const map = await fetchTeacherDisplayNames([userId]);
  return map[userId] ?? "—";
}
