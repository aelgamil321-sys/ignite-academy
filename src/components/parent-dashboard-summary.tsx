import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpenCheck,
  ClipboardCheck,
  Medal,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { formatPeerRankPosition } from "@/lib/parent-performance-report";
import type { ParentDashboardData } from "@/lib/parent-dashboard";

export const PARENT_SECTION_IDS = {
  academicPerformance: "parent-academic-performance",
  certificates: "parent-certificates",
  progressReport: "parent-progress-report",
} as const;

type SummaryCard = {
  key: string;
  icon: LucideIcon;
  emoji: string;
  label: string;
  value: string;
  rankSublabel?: string;
  action:
    | { type: "scroll"; targetId: string }
    | { type: "navigate"; gradeSlug: string };
};

const CARD_INTERACTION_CLASS =
  "parent-dash-card-enter group relative w-full overflow-hidden rounded-2xl border border-primary/15 bg-card p-4 text-start shadow-[var(--shadow-soft)] transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:border-primary/50 hover:shadow-[var(--shadow-gold)] hover:ring-2 hover:ring-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:translate-y-0";

function scrollToSection(targetId: string) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SummaryCardContent({ card }: { card: SummaryCard }) {
  const Icon = card.icon;
  const isRank = Boolean(card.rankSublabel);
  return (
    <>
      {isRank ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-primary/20 via-primary to-primary/20"
          aria-hidden
        />
      ) : null}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-lg" aria-hidden>
          {card.emoji}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20 group-hover:shadow-[0_0_12px_rgba(242,178,27,0.35)]">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div
        className={
          card.rankSublabel
            ? "font-display text-3xl leading-none tracking-tight text-primary sm:text-[2rem]"
            : "font-display text-2xl leading-none text-foreground"
        }
      >
        {card.value}
      </div>
      {card.rankSublabel ? (
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
          {card.rankSublabel}
        </div>
      ) : null}
      <div className="mt-1.5 text-xs font-medium leading-snug text-muted-foreground group-hover:text-foreground/80">
        {card.label}
      </div>
      <div
        className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary/0 transition-all duration-300 group-hover:text-primary/80"
        aria-hidden
      >
        →
      </div>
    </>
  );
}

export function ParentDashboardSummary({ data }: { data: ParentDashboardData }) {
  const { tr } = useI18n();
  const { progress, performanceReport: report } = data;

  const cards: SummaryCard[] = [
    {
      key: "progress",
      icon: TrendingUp,
      emoji: "📈",
      label: tr("parent_academic_progress"),
      value: `${progress.overallProgressPct}%`,
      action: { type: "scroll", targetId: PARENT_SECTION_IDS.progressReport },
    },
    {
      key: "certificates",
      icon: Award,
      emoji: "🏆",
      label: tr("parent_certificates_earned"),
      value: String(progress.certificatesEarned),
      action: { type: "scroll", targetId: PARENT_SECTION_IDS.certificates },
    },
    {
      key: "lessons",
      icon: BookOpenCheck,
      emoji: "📚",
      label: tr("parent_lessons_completed"),
      value: `${progress.completedLessons}/${progress.totalLessons}`,
      action: { type: "navigate", gradeSlug: data.gradeSlug },
    },
    {
      key: "average",
      icon: ClipboardCheck,
      emoji: "📝",
      label: tr("parent_average_score"),
      value: progress.averageQuizScorePct === null ? "—" : `${progress.averageQuizScorePct}%`,
      action: { type: "scroll", targetId: PARENT_SECTION_IDS.academicPerformance },
    },
    {
      key: "grade-rank",
      icon: Medal,
      emoji: "🥇",
      label: tr("parent_rank_grade"),
      value: formatPeerRankPosition(report.rankings.grade),
      rankSublabel: tr("parent_current_rank"),
      action: { type: "scroll", targetId: PARENT_SECTION_IDS.progressReport },
    },
    {
      key: "islamic-rank",
      icon: Trophy,
      emoji: "⭐",
      label: tr("parent_rank_islamic"),
      value: formatPeerRankPosition(report.rankings.islamicGroup),
      rankSublabel: tr("parent_current_rank"),
      action: { type: "scroll", targetId: PARENT_SECTION_IDS.progressReport },
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => {
        if (card.action.type === "navigate") {
          return (
            <Link
              key={card.key}
              to="/grades/$grade"
              params={{ grade: card.action.gradeSlug }}
              className={CARD_INTERACTION_CLASS}
              style={{ animationDelay: `${index * 60}ms` }}
              aria-label={`${card.label} — ${tr("parent_view_grade_lessons")}`}
            >
              <SummaryCardContent card={card} />
            </Link>
          );
        }

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => {
              if (card.action.type === "scroll") scrollToSection(card.action.targetId);
            }}
            className={CARD_INTERACTION_CLASS}
            style={{ animationDelay: `${index * 60}ms` }}
            aria-label={`${card.label} — ${tr("parent_go_to_section")}`}
          >
            <SummaryCardContent card={card} />
          </button>
        );
      })}
    </div>
  );
}
