import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Award, ClipboardCheck, Loader2, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { fetchAdminAnalytics } from "@/lib/admin-analytics";
import { useI18n, L } from "@/lib/i18n";

const chartConfig = {
  score: {
    label: "Avg. score",
    color: "#F2B21B",
  },
};

export function AdminHomeAnalyticsPreview() {
  const { tr, dir, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    studentCount: number;
    submissionCount: number;
    certificateCount: number;
    averageScorePct: number | null;
    gradeBars: Array<{ label: string; score: number }>;
    islamicA: number | null;
    islamicB: number | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAdminAnalytics({ grade: "", section: "", islamicGroup: "" }).then((result) => {
      if (!active) return;
      if (!result.data) {
        setSummary(null);
        setLoading(false);
        return;
      }
      const data = result.data;
      const gradeBars = data.byGrade
        .filter((row) => row.averageScorePct !== null)
        .slice(0, 8)
        .map((row) => ({
          label: L(row.labelEn, row.labelAr)[lang],
          score: row.averageScorePct ?? 0,
        }));
      const groupA = data.islamicGroupCards.find((c) => c.group === "A");
      const groupB = data.islamicGroupCards.find((c) => c.group === "B");
      setSummary({
        studentCount: data.summary.studentCount,
        submissionCount: data.summary.submissionCount,
        certificateCount: data.summary.certificateCount,
        averageScorePct: data.summary.averageScorePct,
        gradeBars,
        islamicA: groupA?.averageScorePct ?? null,
        islamicB: groupB?.averageScorePct ?? null,
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [lang]);

  return (
    <section className="container-page min-w-0 py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {tr("admin_home_analytics_eyebrow")}
        </p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl md:text-5xl text-foreground break-words">
          {tr("admin_home_analytics_title")}
        </h2>
        <p className="mt-4 text-base text-foreground/65">{tr("admin_home_analytics_lead")}</p>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          {tr("admin_home_analytics_loading")}
        </div>
      ) : summary ? (
        <div className="mt-10 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, label: tr("admin_home_analytics_students"), value: String(summary.studentCount) },
              {
                icon: BarChart3,
                label: tr("admin_home_analytics_avg_score"),
                value: summary.averageScorePct === null ? "—" : `${summary.averageScorePct}%`,
              },
              { icon: ClipboardCheck, label: tr("admin_home_analytics_submissions"), value: String(summary.submissionCount) },
              { icon: Award, label: tr("admin_home_analytics_certificates"), value: String(summary.certificateCount) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-foreground/10 bg-white p-5 shadow-[var(--shadow-soft)]"
              >
                <item.icon className="h-5 w-5 text-primary mb-3" />
                <div className="font-display text-2xl text-foreground">{item.value}</div>
                <div className="mt-1 text-sm text-foreground/65">{item.label}</div>
              </div>
            ))}
          </div>

          {(summary.islamicA !== null || summary.islamicB !== null) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-foreground/10 bg-white p-5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {tr("admin_home_analytics_islamic_a")}
                </div>
                <div className="mt-1 font-display text-3xl text-primary">
                  {summary.islamicA === null ? "—" : `${summary.islamicA}%`}
                </div>
              </div>
              <div className="rounded-2xl border border-foreground/10 bg-white p-5">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {tr("admin_home_analytics_islamic_b")}
                </div>
                <div className="mt-1 font-display text-3xl text-primary">
                  {summary.islamicB === null ? "—" : `${summary.islamicB}%`}
                </div>
              </div>
            </div>
          )}

          {summary.gradeBars.length > 0 ? (
            <div className="rounded-2xl border border-foreground/10 bg-white p-4 sm:p-6 shadow-[var(--shadow-soft)] min-w-0 max-w-full overflow-x-auto">
              <h3 className="font-display text-lg text-foreground mb-4">
                {tr("admin_home_analytics_grade_chart")}
              </h3>
              <ChartContainer config={chartConfig} className="h-[280px] w-full min-w-[280px]">
                <BarChart
                  data={summary.gradeBars}
                  margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
                  barCategoryGap="24%"
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    interval={0}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    domain={[0, 100]}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="score"
                    fill="var(--color-score)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-10 text-sm text-muted-foreground">{tr("admin_home_analytics_empty")}</p>
      )}

      <div className="mt-8">
        <Link
          to="/admin/analytics"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {tr("admin_home_analytics_cta")}
          <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
        </Link>
      </div>
    </section>
  );
}
