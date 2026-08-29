import type { LucideIcon } from "lucide-react";
import { Award, ClipboardList, TrendingUp, FileText } from "lucide-react";
import { useI18n, type TKey } from "@/lib/i18n";
import { PARENT_NAV_ANCHORS } from "@/lib/parent-nav";
import {
  PARENT_DASH_EMPTY,
  PARENT_DASH_KPI,
  PARENT_DASH_KPI_VALUE,
} from "@/lib/parent-dashboard-ui";
import type { ParentDashboardData } from "@/lib/parent-dashboard";

export const PARENT_SECTION_IDS = {
  academicPerformance: "parent-academic-performance",
  certificates: "parent-certificates",
  progressReport: "parent-progress-report",
} as const;

type KpiCard = {
  key: string;
  icon: LucideIcon;
  labelKey: TKey;
  value: string;
  context?: string;
  anchor?: string;
};

function scrollToAnchor(anchorId: string) {
  document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function KpiCardView({ card, tr }: { card: KpiCard; tr: (k: TKey) => string }) {
  const Icon = card.icon;
  const context = card.context;

  const body = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-background text-primary shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className={PARENT_DASH_KPI_VALUE}>{card.value}</div>
      <div className="mt-1.5 text-xs font-semibold text-foreground">{tr(card.labelKey)}</div>
      {context ? (
        <p className="mt-1 text-[11px] leading-snug text-foreground/60">{context}</p>
      ) : null}
    </>
  );

  if (card.anchor) {
    return (
      <button
        type="button"
        onClick={() => scrollToAnchor(card.anchor!)}
        className={`w-full ${PARENT_DASH_KPI} text-start transition-colors hover:border-primary/35 hover:shadow-[var(--shadow-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={PARENT_DASH_KPI}>
      {body}
    </div>
  );
}

export function ParentDashboardSummary({
  data,
  assignmentsNeedingAttention,
  assignmentsLoading,
}: {
  data: ParentDashboardData;
  assignmentsNeedingAttention: number;
  assignmentsLoading: boolean;
}) {
  const { tr, trf } = useI18n();
  const { progress } = data;

  const progressContext =
    progress.totalLessons <= 0
      ? tr("parent_kpi_no_lessons_yet")
      : progress.completedLessons === 0
        ? tr("parent_kpi_no_lessons_completed")
        : trf("parent_kpi_lessons_count", { n: progress.completedLessons });

  const quizValue =
    progress.averageQuizScorePct === null ? "—" : `${progress.averageQuizScorePct}%`;
  const quizContext =
    progress.averageQuizScorePct === null ? tr("parent_kpi_no_quiz_yet") : undefined;

  const attentionValue = assignmentsLoading ? "…" : String(assignmentsNeedingAttention);
  const attentionContext =
    !assignmentsLoading && assignmentsNeedingAttention === 0
      ? tr("parent_kpi_nothing_attention")
      : undefined;

  const certValue = String(progress.certificatesEarned);
  const certContext =
    progress.certificatesEarned === 0 ? tr("parent_kpi_no_certs_yet") : undefined;

  const cards: KpiCard[] = [
    {
      key: "progress",
      icon: TrendingUp,
      labelKey: "parent_academic_progress",
      value: `${progress.overallProgressPct}%`,
      context: progressContext,
      anchor: PARENT_NAV_ANCHORS.progress,
    },
    {
      key: "quiz",
      icon: FileText,
      labelKey: "parent_average_score",
      value: quizValue,
      context: quizContext,
      anchor: PARENT_NAV_ANCHORS.progress,
    },
    {
      key: "attention",
      icon: ClipboardList,
      labelKey: "parent_kpi_attention",
      value: attentionValue,
      context: attentionContext,
      anchor: PARENT_NAV_ANCHORS.assignments,
    },
    {
      key: "certificates",
      icon: Award,
      labelKey: "parent_certificates_earned",
      value: certValue,
      context: certContext,
      anchor: PARENT_NAV_ANCHORS.achievements,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <KpiCardView key={card.key} card={card} tr={tr} />
      ))}
    </div>
  );
}
