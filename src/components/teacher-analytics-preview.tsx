import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TeacherDashboardSection } from "@/components/teacher-dashboard-section";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { AdminAnalyticsSnapshot } from "@/lib/admin-analytics";
import { useI18n } from "@/lib/i18n";
import {
  buildTeacherPreviewComparisonBars,
  formatAnalyticsPct,
} from "@/lib/teacher-analytics-ui";
import type { TeacherAnalyticsScope } from "@/lib/teacher-analytics";

const chartConfig = {
  score: {
    label: "Avg. score",
    color: "#F2B21B",
  },
};

export type TeacherAnalyticsPreviewProps = {
  snapshot?: AdminAnalyticsSnapshot | null;
  scope?: TeacherAnalyticsScope | null;
  loading?: boolean;
  error?: boolean;
};

export function TeacherAnalyticsPreview({
  snapshot,
  scope,
  loading = false,
  error = false,
}: TeacherAnalyticsPreviewProps) {
  const { tr, dir, lang } = useI18n();

  const comparisonBars =
    snapshot && scope ? buildTeacherPreviewComparisonBars(snapshot, scope, lang) : [];
  const chartData = comparisonBars.map((bar) => ({
    label: bar.label,
    score: bar.hasData ? bar.score : 0,
    displayScore: bar.hasData ? `${bar.score}%` : "—",
  }));

  return (
    <TeacherDashboardSection
      title={tr("teacher_dash_section_analytics")}
      icon={<BarChart3 className="h-5 w-5" />}
      action={
        <Link
          to="/teacher/performance"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {tr("teacher_dash_analytics_cta")}
          <ArrowRight className={`h-3.5 w-3.5 ${dir === "rtl" ? "rotate-180" : ""}`} />
        </Link>
      }
    >
      {loading ? (
        <div className="flex min-h-[180px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("teacher_loading")}
        </div>
      ) : error ? (
        <p className="rounded-xl border border-border/80 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
          {tr("teacher_dash_widget_load_error")}
        </p>
      ) : !snapshot ? (
        <p className="rounded-xl border border-border/80 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
          {tr("teacher_analytics_not_permitted")}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/10 px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tr("teacher_dash_kpi_avg_performance")}
            </p>
            <p className="mt-1 font-display text-3xl text-primary">
              {formatAnalyticsPct(snapshot.summary.averageScorePct)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tr("teacher_dash_student_count", { count: String(snapshot.summary.studentCount) })}
            </p>
          </div>

          {comparisonBars.length > 0 ? (
            <div className="min-w-0 overflow-x-auto">
              <ul className="mb-3 space-y-1.5 text-xs">
                {comparisonBars.map((bar) => (
                  <li
                    key={bar.label}
                    className="flex items-center justify-between gap-2 text-muted-foreground"
                  >
                    <span className="truncate text-foreground">{bar.label}</span>
                    <span className="shrink-0 font-semibold text-primary">
                      {bar.hasData ? `${bar.score}%` : tr("teacher_perf_no_data")}
                    </span>
                  </li>
                ))}
              </ul>
              <ChartContainer config={chartConfig} className="h-[140px] w-full min-w-[200px]">
                <BarChart
                  data={chartData}
                  margin={{ left: 4, right: 8, top: 4, bottom: 0 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    interval={0}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    width={28}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="score"
                    fill="var(--color-score)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">{tr("teacher_perf_no_comparison")}</p>
          )}
        </div>
      )}
    </TeacherDashboardSection>
  );
}
