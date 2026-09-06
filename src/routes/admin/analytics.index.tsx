import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KhdaAnalyticsDashboard } from "@/components/analytics/khda-analytics-dashboard";
import { KhdaAnalyticsFilterBar } from "@/components/analytics/khda-analytics-filter-bar";
import {
  KhdaAnalyticsLoading,
} from "@/components/analytics/khda-analytics-primitives";
import { fetchAdminKhdaAnalytics } from "@/lib/khda-analytics-fetch";
import type { AnalyticsFilters } from "@/lib/admin-analytics";
import type { KhdaAnalyticsBundle } from "@/lib/khda-analytics-fetch";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/analytics/")({
  head: () => ({
    meta: [
      { title: "Analytics — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminAnalyticsPage,
});

export function AdminAnalyticsPage() {
  const { tr } = useI18n();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    grade: "",
    section: "",
    islamicGroup: "",
  });
  const [bundle, setBundle] = useState<KhdaAnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAdminKhdaAnalytics(filters);
    if (result.error) {
      toast.error(result.error);
      setBundle(null);
    } else {
      setBundle(result.data);
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-w-0 space-y-4">
      <header className="rounded-xl border border-border/80 bg-card px-4 py-5 shadow-sm sm:px-5">
        <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {tr("khda_command_center_title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{tr("khda_command_center_subtitle")}</p>
      </header>

      <KhdaAnalyticsFilterBar filters={filters} onChange={setFilters} showTeachingSubject />

      {loading ? (
        <KhdaAnalyticsLoading />
      ) : bundle ? (
        <KhdaAnalyticsDashboard bundle={bundle} />
      ) : null}
    </div>
  );
}
