import type { ReactNode } from "react";
import type { IslamicGroupCard } from "@/lib/admin-analytics";
import { buildKhdaInsights } from "@/lib/khda-analytics-insights";
import type { KhdaAnalyticsBundle } from "@/lib/khda-analytics-fetch";
import { filterIslamicGroupCardsForScope } from "@/lib/teacher-analytics-ui";
import type { TeacherAnalyticsScope } from "@/lib/teacher-analytics";
import { formatKhdaPct, quantitativeDescriptor } from "@/lib/khda-performance";
import { useI18n } from "@/lib/i18n";
import {
  KhdaDistributionChart,
  KhdaGroupBarChart,
  KhdaIslamicGroupPanel,
  KhdaNeedsAttentionTable,
  KhdaSubjectComparisonPanel,
  KhdaTopSectionsChart,
  KhdaTopStudentsTable,
  KhdaTrendChart,
} from "@/components/analytics/khda-analytics-charts";
import {
  KhdaInsightStrip,
  KhdaKpiCard,
  KhdaPerformanceLegend,
} from "@/components/analytics/khda-analytics-primitives";

export type KhdaAnalyticsDashboardProps = {
  bundle: KhdaAnalyticsBundle;
  scope?: TeacherAnalyticsScope | null;
  header?: ReactNode;
};

export function KhdaAnalyticsDashboard({ bundle, scope, header }: KhdaAnalyticsDashboardProps) {
  const { lang, tr } = useI18n();
  const { snapshot, enrichment } = bundle;
  const insights = buildKhdaInsights(snapshot, enrichment, lang);

  const islamicCards: IslamicGroupCard[] = scope
    ? filterIslamicGroupCardsForScope(snapshot, scope)
    : snapshot.islamicGroupCards;

  const meetingTargetFootnote =
    enrichment.meetingTargetPct !== null
      ? quantitativeDescriptor(enrichment.meetingTargetPct, lang)
      : null;

  return (
    <div className="min-w-0 space-y-4">
      {header}

      <KhdaInsightStrip insights={insights} />

      <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {tr("khda_legend_title")}
        </h3>
        <KhdaPerformanceLegend compact />
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <KhdaKpiCard label={tr("khda_kpi_students")} value={String(snapshot.summary.studentCount)} />
        <KhdaKpiCard
          label={tr("khda_kpi_avg_performance")}
          value={formatKhdaPct(snapshot.summary.averageScorePct)}
          scorePct={snapshot.summary.averageScorePct}
        />
        <KhdaKpiCard
          label={tr("khda_kpi_submissions")}
          value={String(snapshot.summary.submissionCount)}
        />
        <KhdaKpiCard
          label={tr("khda_kpi_certificates")}
          value={String(snapshot.summary.certificateCount)}
        />
        <KhdaKpiCard
          label={tr("khda_kpi_meeting_target")}
          value={
            enrichment.meetingTargetPct === null
              ? "—"
              : `${enrichment.meetingTargetPct}%`
          }
          scorePct={enrichment.meetingTargetPct}
          proportionDescriptor
          footnote={
            meetingTargetFootnote
              ? `${enrichment.meetingTargetCount} ${tr("khda_students")} · ${meetingTargetFootnote}`
              : `${enrichment.meetingTargetCount} ${tr("khda_students")}`
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <KhdaDistributionChart
          bands={enrichment.distribution}
          totalStudents={enrichment.distributionTotalStudents}
        />
        <KhdaTrendChart points={enrichment.trend} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <KhdaGroupBarChart title={tr("khda_performance_by_grade")} rows={snapshot.byGrade} />
        <KhdaGroupBarChart title={tr("khda_performance_by_section")} rows={snapshot.bySection} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <KhdaIslamicGroupPanel cards={islamicCards} />
        <KhdaSubjectComparisonPanel rows={enrichment.subjectComparison} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <KhdaTopStudentsTable rows={snapshot.topStudents} />
        <KhdaTopSectionsChart rows={snapshot.topSections} />
      </div>

      <KhdaNeedsAttentionTable rows={snapshot.atRiskStudents} />
    </div>
  );
}
