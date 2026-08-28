import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves announcement creator display names for Admin Home only.
 * Uses admin-only RPC — not direct profiles reads (no email exposure; non-admins denied server-side).
 */
export async function fetchAnnouncementCreatorNames(
  userIds: string[],
): Promise<Record<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const { data, error } = await supabase.rpc("get_announcement_creator_display_names", {
    p_user_ids: ids,
  });

  if (error) {
    console.warn("fetchAnnouncementCreatorNames failed", error.message);
    return {};
  }

  const payload = (data ?? {}) as Record<string, string>;
  const map: Record<string, string> = {};
  for (const [userId, name] of Object.entries(payload)) {
    const trimmed = (name ?? "").trim();
    if (trimmed && trimmed !== "—") map[userId] = trimmed;
  }
  return map;
}
