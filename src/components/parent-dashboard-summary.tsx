import type { LucideIcon } from "lucide-react";
import {
  Award,
  BookOpenCheck,
  ClipboardCheck,
  Medal,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useI18n, L } from "@/lib/i18n";
import { formatPeerRank } from "@/lib/parent-performance-report";
import type { ParentDashboardData } from "@/lib/parent-dashboard";

type SummaryCard = {
  key: string;
  icon: LucideIcon;
  emoji: string;
  label: string;
  value: string;
};

export function ParentDashboardSummary({ data }: { data: ParentDashboardData }) {
  const { lang } = useI18n();
  const { progress, performanceReport: report } = data;

  const cards: SummaryCard[] = [
    {
      key: "progress",
      icon: TrendingUp,
      emoji: "📈",
      label: L("Academic Progress", "التقدم الدراسي")[lang],
      value: `${progress.overallProgressPct}%`,
    },
    {
      key: "certificates",
      icon: Award,
      emoji: "🏆",
      label: L("Certificates Earned", "الشهادات المكتسبة")[lang],
      value: String(progress.certificatesEarned),
    },
    {
      key: "lessons",
      icon: BookOpenCheck,
      emoji: "📚",
      label: L("Lessons Completed", "الدروس المكتملة")[lang],
      value: `${progress.completedLessons}/${progress.totalLessons}`,
    },
    {
      key: "average",
      icon: ClipboardCheck,
      emoji: "📝",
      label: L("Average Score", "متوسط الدرجات")[lang],
      value: progress.averageQuizScorePct === null ? "—" : `${progress.averageQuizScorePct}%`,
    },
    {
      key: "grade-rank",
      icon: Medal,
      emoji: "🥇",
      label: L("Rank in Grade", "الترتيب في الصف")[lang],
      value: formatPeerRank(report.rankings.grade, lang),
    },
    {
      key: "islamic-rank",
      icon: Trophy,
      emoji: "⭐",
      label: L("Rank in Islamic Group", "الترتيب في الإسلامية")[lang],
      value: formatPeerRank(report.rankings.islamicGroup, lang),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="parent-dash-card-enter group rounded-2xl border border-primary/15 bg-card p-4 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[var(--shadow-gold)]"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-lg" aria-hidden>
                {card.emoji}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="font-display text-2xl leading-none text-foreground">{card.value}</div>
            <div className="mt-1.5 text-xs font-medium leading-snug text-muted-foreground">
              {card.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
