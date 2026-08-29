import { Award, BookOpen, ChartBar, GraduationCap, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { computeStudentBadges } from "@/lib/student-badges";
import type { StudentProgressData } from "@/lib/student-progress";

type StudentDashboardKpisProps = {
  progress: StudentProgressData;
};

type KpiItem = {
  icon: typeof TrendingUp;
  labelKey: string;
  value: string;
};

export function StudentDashboardKpis({ progress }: StudentDashboardKpisProps) {
  const { tr } = useI18n();
  const { unlockedCount } = computeStudentBadges(progress);

  const items: KpiItem[] = [
    {
      icon: TrendingUp,
      labelKey: "student_dash_kpi_overall_progress",
      value: `${progress.overallProgressPct}%`,
    },
    {
      icon: BookOpen,
      labelKey: "student_dash_kpi_completed_lessons",
      value: String(progress.completedLessons),
    },
    {
      icon: ChartBar,
      labelKey: "student_dash_kpi_avg_quiz",
      value: progress.averageQuizScorePct === null ? "—" : `${progress.averageQuizScorePct}%`,
    },
    {
      icon: GraduationCap,
      labelKey: "student_dash_kpi_certificates",
      value: String(progress.certificatesEarned),
    },
    {
      icon: Award,
      labelKey: "student_dash_kpi_achievements",
      value: String(unlockedCount),
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.labelKey}
            className="flex min-h-[5.75rem] min-w-0 flex-col rounded-xl border border-border/80 bg-card p-3.5 shadow-[var(--shadow-soft)] sm:min-h-[6.25rem] sm:p-4"
          >
            <div className="mb-auto flex items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                {tr(item.labelKey)}
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-semibold leading-none text-brand-dark sm:text-[1.75rem]">
              {item.value}
            </p>
            <div className="mt-2 h-0.5 w-8 rounded-full bg-primary/60" aria-hidden />
          </div>
        );
      })}
    </div>
  );
}
