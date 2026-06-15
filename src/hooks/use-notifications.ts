import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  refreshNotificationSources,
  type NotificationRow,
} from "@/lib/notifications";
import { fetchStudentProgress } from "@/lib/student-progress";
import { evaluateStudentBadges } from "@/lib/student-badges";
import { getAccountRole } from "@/lib/account-role";

export function useNotifications(enabled: boolean) {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setUserId(null);
      setItems([]);
      setUnreadCount(0);
      return;
    }

    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      syncedRef.current = false;
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [enabled]);

  const load = useCallback(async () => {
    if (!enabled || !userId) return;
    setLoading(true);
    const [listRes, countRes] = await Promise.all([
      fetchNotifications(),
      fetchUnreadNotificationCount(),
    ]);
    setItems(listRes.data);
    setUnreadCount(countRes.count);
    setLoading(false);
  }, [enabled, userId]);

  const syncSources = useCallback(async () => {
    if (!userId || syncedRef.current) return;
    syncedRef.current = true;

    const role = await getAccountRole(userId);
    if (role === "student") {
      const { data: progress } = await fetchStudentProgress(userId);
      if (progress) {
        await refreshNotificationSources(userId, evaluateStudentBadges(progress), role);
      } else {
        await refreshNotificationSources(userId, [], role);
      }
    } else {
      await refreshNotificationSources(userId, [], role);
    }
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId) return;
    void (async () => {
      await syncSources();
      await load();
    })();
  }, [enabled, userId, load, syncSources]);

  useEffect(() => {
    if (!enabled || !userId) return;
    const interval = window.setInterval(() => {
      void load();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [enabled, userId, load]);

  return {
    userId,
    items,
    unreadCount,
    loading,
    reload: load,
    syncSources,
  };
}
