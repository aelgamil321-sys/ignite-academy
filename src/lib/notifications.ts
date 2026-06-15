import { supabase } from "@/integrations/supabase/client";
import type { StudentBadgeId } from "@/lib/student-badges";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  href: string | null;
  related_student_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

const BADGE_STORAGE_KEY = "ignite_seen_badges_v1";

export function notificationTitle(n: Pick<NotificationRow, "title_en" | "title_ar">) {
  return { en: n.title_en, ar: n.title_ar };
}

export function notificationBody(n: Pick<NotificationRow, "body_en" | "body_ar">) {
  return { en: n.body_en, ar: n.body_ar };
}

function normalizeRow(row: Record<string, unknown>): NotificationRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    type: String(row.type),
    title_en: String(row.title_en ?? ""),
    title_ar: String(row.title_ar ?? ""),
    body_en: String(row.body_en ?? ""),
    body_ar: String(row.body_ar ?? ""),
    href: row.href ? String(row.href) : null,
    related_student_id: row.related_student_id ? String(row.related_student_id) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    read_at: row.read_at ? String(row.read_at) : null,
    created_at: String(row.created_at ?? ""),
  };
}

export async function fetchNotifications(limit = 30): Promise<{
  data: NotificationRow[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { data: [], error: error.message };
    return { data: (data ?? []).map((r) => normalizeRow(r as Record<string, unknown>)), error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load notifications";
    return { data: [], error: message };
  }
}

export async function fetchUnreadNotificationCount(): Promise<{
  count: number;
  error: string | null;
}> {
  try {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null);

    if (error) return { count: 0, error: error.message };
    return { count: count ?? 0, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load unread count";
    return { count: 0, error: message };
  }
}

async function callNotificationRpc(
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.rpc(fn as "has_role", args as never);
    return { error: error?.message ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : `RPC ${fn} failed`;
    return { error: message };
  }
}

export async function markNotificationRead(notificationId: string): Promise<{ error: string | null }> {
  return callNotificationRpc("mark_notification_read", { p_notification_id: notificationId });
}

export async function markAllNotificationsRead(): Promise<{ error: string | null }> {
  return callNotificationRpc("mark_all_notifications_read");
}

export async function syncParentMissingAssignmentNotifications(): Promise<void> {
  const { error } = await callNotificationRpc("sync_parent_missing_assignment_notifications");
  if (error) console.warn("[notifications parent missing]", error);
}

export async function syncAssignmentDueSoonNotifications(): Promise<void> {
  const { error } = await callNotificationRpc("sync_assignment_due_soon_notifications");
  if (error) console.warn("[notifications due soon]", error);
}

export async function notifyBadgeUnlocked(badgeId: StudentBadgeId): Promise<void> {
  const { error } = await callNotificationRpc("notify_badge_unlocked", { p_badge_id: badgeId });
  if (error) console.warn("[notifications badge]", error);
}

function readSeenBadges(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(`${BADGE_STORAGE_KEY}:${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSeenBadges(userId: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${BADGE_STORAGE_KEY}:${userId}`, JSON.stringify([...ids]));
}

/** Create notifications for newly unlocked badges (app-level rules). */
export async function syncBadgeNotifications(
  userId: string,
  unlockedBadgeIds: StudentBadgeId[],
): Promise<void> {
  const seen = readSeenBadges(userId);
  const next = new Set(seen);
  let changed = false;

  for (const badgeId of unlockedBadgeIds) {
    if (seen.has(badgeId)) continue;
    await notifyBadgeUnlocked(badgeId);
    next.add(badgeId);
    changed = true;
  }

  if (changed) writeSeenBadges(userId, next);
}

export async function refreshNotificationSources(
  userId: string,
  unlockedBadgeIds: StudentBadgeId[],
  role: "student" | "parent" | "admin" | null,
): Promise<void> {
  try {
    if (role === "student") {
      await Promise.all([
        syncAssignmentDueSoonNotifications(),
        syncBadgeNotifications(userId, unlockedBadgeIds),
      ]);
      return;
    }

    if (role === "parent") {
      await syncParentMissingAssignmentNotifications();
    }
  } catch (error) {
    console.warn("[notifications refresh]", error);
  }
}

export function formatNotificationTime(iso: string, lang: "en" | "ar"): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function notificationIcon(type: string): string {
  switch (type) {
    case "assignment_created":
    case "assignment_due_soon":
    case "assignment_graded":
    case "child_assignment_submitted":
    case "child_assignment_graded":
    case "child_assignment_missing":
    case "admin_assignment_submitted":
    case "admin_student_registered":
    case "admin_parent_registered":
      return "📋";
    case "certificate_earned":
    case "child_certificate_earned":
      return "🏆";
    case "badge_unlocked":
    case "child_badge_unlocked":
      return "⭐";
    default:
      return "🔔";
  }
}
