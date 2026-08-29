import { Award, BookOpen, ChartBar, GraduationCap, TrendingUp } from "lucide-react";
import { StudentDashboardSection } from "@/components/student-dashboard-section";
import { useI18n } from "@/lib/i18n";
import { computeStudentBadges } from "@/lib/student-badges";
import type { StudentProgressData } from "@/lib/student-progress";

type StudentProfileProgressSummaryProps = {
  progress: StudentProgressData;
};

export function StudentProfileProgressSummary({ progress }: StudentProfileProgressSummaryProps) {
  const { tr } = useI18n();
  const { unlockedCount } = computeStudentBadges(progress);

  const items = [
    {
      icon: TrendingUp,
      label: tr("student_dash_kpi_overall_progress"),
      value: `${progress.overallProgressPct}%`,
    },
    {
      icon: ChartBar,
      label: tr("student_dash_kpi_avg_quiz"),
      value: progress.averageQuizScorePct === null ? "—" : `${progress.averageQuizScorePct}%`,
    },
    {
      icon: BookOpen,
      label: tr("student_dash_kpi_completed_lessons"),
      value: `${progress.completedLessons} / ${progress.totalLessons}`,
    },
    {
      icon: GraduationCap,
      label: tr("student_dash_kpi_certificates"),
      value: String(progress.certificatesEarned),
    },
    {
      icon: Award,
      label: tr("student_dash_kpi_achievements"),
      value: String(unlockedCount),
    },
  ];

  return (
    <StudentDashboardSection
      title={tr("student_profile_progress_summary")}
      lead={tr("student_profile_progress_summary_lead")}
      icon={<TrendingUp className="h-4 w-4" aria-hidden />}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5"
            >
              <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span className="line-clamp-2 text-[10px] font-semibold uppercase tracking-wide">
                  {item.label}
                </span>
              </div>
              <p className="font-display text-lg font-semibold text-brand-dark">{item.value}</p>
            </div>
          );
        })}
      </div>
    </StudentDashboardSection>
  );
}
