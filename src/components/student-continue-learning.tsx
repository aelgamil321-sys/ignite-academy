import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { StudentAchievement, StudentProgressData } from "@/lib/student-progress";
import { cn } from "@/lib/utils";

function findInProgressLesson(progress: StudentProgressData): StudentAchievement | null {
  return progress.recentAchievements.find((a) => a.kind === "quiz_submit") ?? null;
}

type StudentContinueLearningProps = {
  progress: StudentProgressData;
  gradeSlug: string;
  hasGrade: boolean;
};

export function StudentContinueLearning({ progress, gradeSlug, hasGrade }: StudentContinueLearningProps) {
  const { tr, bi } = useI18n();
  const inProgress = findInProgressLesson(progress);
  const gradeLessonsTo = hasGrade ? `/grades/${gradeSlug}` : "/student/profile";

  return (
    <section className="flex h-full min-w-0 flex-col rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-card to-card p-4 shadow-[var(--shadow-soft)] ring-1 ring-primary/10 sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <BookOpen className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="font-display text-base font-semibold text-foreground sm:text-lg">
          {tr("student_dash_continue_learning")}
        </h2>
      </div>

      {inProgress ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <p className="line-clamp-2 text-base font-semibold text-foreground sm:text-lg">
            {bi(inProgress.lessonTitle)}
          </p>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>{tr("student_dash_quiz_progress")}</span>
              <span className="font-semibold text-foreground">{inProgress.scorePct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.max(0, inProgress.scorePct))}%` }}
              />
            </div>
          </div>
          <Link
            to="/grades/$grade/$lesson"
            params={{ grade: gradeSlug, lesson: inProgress.lessonId }}
            className={cn(
              "mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover sm:w-auto",
            )}
          >
            {tr("student_dash_continue_lesson")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
          <p className="text-sm text-muted-foreground">{tr("student_dash_no_lesson_in_progress")}</p>
          <Link
            to={gradeLessonsTo}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-dark px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark/90 sm:w-auto"
          >
            {tr("student_dash_explore_grade_lessons")}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}
