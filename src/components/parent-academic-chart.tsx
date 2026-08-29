import { BarChart3, BookOpenCheck } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useI18n } from "@/lib/i18n";
import {
  PARENT_DASH_EMPTY,
  PARENT_DASH_SECTION,
  PARENT_DASH_SECTION_LEAD,
  PARENT_DASH_SECTION_TITLE,
} from "@/lib/parent-dashboard-ui";
import { formatPeerRank, type ParentPerformanceReport } from "@/lib/parent-performance-report";

const chartConfig = {
  scorePct: {
    label: "Score",
    color: "hsl(var(--primary))",
  },
};

function RankChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/80 bg-background px-2.5 py-1.5 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/55">
        {label}
      </div>
      <div className="mt-0.5 font-display text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function ParentAcademicChart({ report }: { report: ParentPerformanceReport }) {
  const { tr, trf, lang } = useI18n();
  const trend = report.quizTrend;
  const singlePoint = trend.length === 1;
  const hasTrend = trend.length > 0;
  const average = report.averageQuizScorePct;
  const { grade, section, islamicGroup } = report.rankings;

  const gradeRank = formatPeerRank(grade, lang);
  const sectionRank = formatPeerRank(section, lang);
  const islamicRank = formatPeerRank(islamicGroup, lang);
  const hasAnyRanking = grade.total > 0 || section.total > 0 || islamicGroup.total > 0;

  return (
    <section className={PARENT_DASH_SECTION}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-background text-primary shadow-sm">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h2 className={PARENT_DASH_SECTION_TITLE}>{tr("parent_academic_performance")}</h2>
            <p className={PARENT_DASH_SECTION_LEAD}>{tr("parent_quiz_trend_lead")}</p>
          </div>
        </div>
        {average !== null ? (
          <div className="rounded-md border border-primary/25 bg-primary/8 px-3 py-1.5 text-center shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/55">
              {tr("parent_average_score")}
            </div>
            <div className="font-display text-lg font-semibold text-primary">{average}%</div>
          </div>
        ) : null}
      </div>

      <div className={`flex items-center gap-2 text-xs text-foreground/60 ${hasTrend ? "mb-3" : "mb-2"}`}>
        <BookOpenCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        <span>
          {report.totalLessons <= 0
            ? tr("parent_kpi_no_lessons_yet")
            : trf("parent_kpi_lessons_count", { n: report.completedLessons })}
        </span>
      </div>

      {hasTrend ? (
        <div className="space-y-2">
          {singlePoint ? (
            <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
              {tr("parent_performance_trend_single")}
            </p>
          ) : null}
          <ChartContainer config={chartConfig} className="aspect-[2.6/1] min-h-[160px] w-full">
            <AreaChart data={trend} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="parentScoreFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-scorePct)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-scorePct)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/60" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fontSize: 11 }} />
              <YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                width={32}
                tick={{ fontSize: 11 }}
                tickFormatter={(value: number) => `${value}%`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`${value}%`, tr("chart_score_label")]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="scorePct"
                stroke="var(--color-scorePct)"
                strokeWidth={2}
                fill="url(#parentScoreFill)"
                dot={{ r: singlePoint ? 4 : 2.5, fill: "var(--color-scorePct)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      ) : (
        <div className={`${PARENT_DASH_EMPTY} mb-2`}>
          <BarChart3 className="h-3.5 w-3.5 shrink-0 text-foreground/45" aria-hidden />
          <span>{tr("parent_quiz_trend_empty")}</span>
        </div>
      )}

      <div className={`border-t border-border/80 ${hasTrend ? "mt-3 pt-3" : "mt-2 pt-2"}`}>
        <div className="mb-1.5 text-xs font-semibold text-foreground/70">
          {tr("parent_rankings_title")}
        </div>
        {hasAnyRanking ? (
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            <RankChip label={tr("parent_rank_grade")} value={gradeRank} />
            <RankChip label={tr("parent_rank_section")} value={sectionRank} />
            <RankChip label={tr("parent_rank_islamic")} value={islamicRank} />
          </div>
        ) : (
          <p className={`${PARENT_DASH_EMPTY} w-full`}>
            <span>{tr("parent_rankings_not_enough")}</span>
          </p>
        )}
      </div>
    </section>
  );
}
