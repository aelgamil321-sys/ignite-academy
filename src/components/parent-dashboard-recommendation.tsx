import { Lightbulb, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  recommendationTierLabel,
  resolveParentRecommendation,
} from "@/lib/parent-dashboard-insights";
import type { ParentDashboardData } from "@/lib/parent-dashboard";

const TIER_STYLES = {
  excellent: {
    border: "border-primary/35",
    bg: "from-primary/12 via-card to-card",
    icon: "bg-primary/20 text-primary",
    badge: "bg-primary/15 text-primary border-primary/30",
  },
  good: {
    border: "border-primary/25",
    bg: "from-primary/8 via-card to-card",
    icon: "bg-primary/15 text-primary",
    badge: "bg-primary/10 text-primary border-primary/25",
  },
  needs_support: {
    border: "border-primary/20",
    bg: "from-primary/6 via-card to-card",
    icon: "bg-primary/12 text-primary",
    badge: "bg-amber-500/10 text-amber-800 border-amber-500/25",
  },
  no_data: {
    border: "border-border",
    bg: "from-muted/40 via-card to-card",
    icon: "bg-muted text-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
  },
} as const;

export function ParentDashboardRecommendation({ data }: { data: ParentDashboardData }) {
  const { tr, dir, lang } = useI18n();
  const average = data.performanceReport.averageQuizScorePct ?? data.progress.averageQuizScorePct;
  const { tier, message } = resolveParentRecommendation(average, tr);
  const styles = TIER_STYLES[tier];

  return (
    <section
      className={`parent-dash-card-enter overflow-hidden rounded-2xl border ${styles.border} bg-gradient-to-br ${styles.bg} p-4 shadow-[var(--shadow-soft)] sm:p-5`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-[0_0_20px_rgba(242,178,27,0.2)] ${styles.icon}`}
        >
          <Lightbulb className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h2 className="font-display text-lg text-foreground sm:text-xl">
              {tr("parent_smart_recommendation")}
            </h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles.badge}`}
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              {recommendationTierLabel(tier, tr)}
            </span>
          </div>

          <p
            className="mt-3 text-base leading-relaxed text-foreground sm:text-lg"
            dir={lang === "ar" || lang === "ur" ? "rtl" : dir}
          >
            {message}
          </p>

          {average !== null && (
            <p
              className="mt-2 text-xs text-muted-foreground"
              dir={lang === "ar" || lang === "ur" ? "rtl" : dir}
            >
              {tr("parent_based_on_avg")}:{" "}
              <span className="font-semibold text-primary">{average}%</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
