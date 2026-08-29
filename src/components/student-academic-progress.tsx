import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenCheck, Medal, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { StudentDashboardSection } from "@/components/student-dashboard-section";
import { useI18n } from "@/lib/i18n";
import { computeStudentBadges } from "@/lib/student-badges";
import type { StudentProgressData } from "@/lib/student-progress";
import { cn } from "@/lib/utils";

function learningLevelClass(enLabel: string): string {
  if (enLabel === "Excellent") return "border-primary/30 bg-primary/10 text-primary";
  if (enLabel === "Very Good") return "border-primary/25 bg-primary/8 text-primary";
  if (enLabel === "Good") return "border-sky-500/25 bg-sky-500/10 text-sky-700";
  if (enLabel === "Pass") return "border-amber-500/25 bg-amber-500/10 text-amber-800";
  if (enLabel === "Not started") return "border-border bg-muted text-muted-foreground";
  return "border-destructive/25 bg-destructive/10 text-destructive";
}

type StudentAcademicProgressProps = {
  progress: StudentProgressData;
  gradeName: string;
  gradeSlug: string;
};

export function StudentAcademicProgress({ progress, gradeName, gradeSlug }: StudentAcademicProgressProps) {
  const { tr, trf, lang } = useI18n();
  const { unlockedCount, totalCount } = computeStudentBadges(progress);
  const learningLevel = lang === "ar" ? progress.learningLevelAr : progress.learningLevelEn;
  const remainingLessons = Math.max(0, progress.totalLessons - progress.completedLessons);

  const detailRows = [
    {
      key: "lessons",
      label: tr("student_dash_academic_lessons"),
      value: `${progress.completedLessons} / ${progress.totalLessons}`,
    },
    {
      key: "quiz",
      label: tr("student_dash_academic_quiz_avg"),
      value: progress.averageQuizScorePct === null ? "—" : `${progress.averageQuizScorePct}%`,
    },
    {
      key: "badges",
      label: tr("student_dash_academic_badge_progress"),
      value: `${unlockedCount} / ${totalCount}`,
    },
  ];

  return (
    <StudentDashboardSection
      title={tr("student_dash_academic_progress")}
      lead={tr("student_dash_academic_progress_lead")}
      icon={<Target className="h-4 w-4" aria-hidden />}
      action={
        <Link
          to="/grades/$grade"
          params={{ grade: gradeSlug }}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          {tr("student_dash_browse_lessons")}
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
        </Link>
      }
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-6">
        <div className="rounded-xl border border-border/70 bg-gradient-to-br from-muted/30 to-background p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {tr("student_dash_kpi_overall_progress")}
              </p>
              <p className="mt-1 font-display text-4xl font-semibold leading-none text-brand-dark sm:text-5xl">
                {progress.overallProgressPct}
                <span className="text-2xl text-primary sm:text-3xl">%</span>
              </p>
            </div>
            <div className="text-end">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {tr("student_dash_my_grade")}
              </p>
              <p className="mt-1 font-display text-sm font-semibold text-foreground sm:text-base">{gradeName}</p>
            </div>
          </div>
          <Progress value={progress.overallProgressPct} className="mt-4 h-2.5 bg-muted" />
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {remainingLessons > 0
              ? trf("student_dash_academic_remaining", { count: String(remainingLessons) })
              : tr("student_dash_academic_all_complete")}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-background px-3 py-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Medal className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {tr("student_dash_learning_level")}
              </p>
              <span
                className={cn(
                  "mt-0.5 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  learningLevelClass(progress.learningLevelEn),
                )}
              >
                {learningLevel}
              </span>
            </div>
          </div>

          {detailRows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2">
                {row.key === "lessons" ? (
                  <BookOpenCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                ) : null}
                <span className="truncate text-xs text-muted-foreground">{row.label}</span>
              </div>
              <span className="shrink-0 font-display text-sm font-semibold text-foreground">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </StudentDashboardSection>
  );
}
