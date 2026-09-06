import { GraduationCap } from "lucide-react";
import { KhdaAnalyticsDashboard } from "@/components/analytics/khda-analytics-dashboard";
import type { KhdaAnalyticsBundle } from "@/lib/khda-analytics-fetch";
import type { TeacherAnalyticsScope } from "@/lib/teacher-analytics";
import { formatTeacherScopeSummary } from "@/lib/teacher-analytics-ui";
import { useI18n } from "@/lib/i18n";
import { Loader2 } from "lucide-react";

export type TeacherPerformanceAnalyticsProps = {
  bundle: KhdaAnalyticsBundle;
  scope: TeacherAnalyticsScope;
};

export function TeacherPerformanceAnalytics({ bundle, scope }: TeacherPerformanceAnalyticsProps) {
  const { lang, tr } = useI18n();

  const header = (
    <header className="rounded-xl border border-border/80 bg-card px-4 py-5 shadow-sm sm:px-5">
      <div className="flex items-start gap-3">
        <GraduationCap className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {tr("teacher_perf_page_title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{tr("teacher_perf_page_lead")}</p>
          <p className="mt-2 text-xs font-medium text-primary/90">
            {formatTeacherScopeSummary(scope, lang)}
          </p>
        </div>
      </div>
    </header>
  );

  return <KhdaAnalyticsDashboard bundle={bundle} scope={scope} header={header} />;
}

export function TeacherPerformanceLoading() {
  const { tr } = useI18n();
  return (
    <div className="flex items-center gap-2 py-10 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      {tr("teacher_perf_loading")}
    </div>
  );
}

export function TeacherPerformanceError({ onRetry }: { onRetry: () => void }) {
  const { tr } = useI18n();
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
      <p className="text-sm text-muted-foreground">{tr("teacher_perf_load_error")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {tr("teacher_perf_retry")}
      </button>
    </div>
  );
}
