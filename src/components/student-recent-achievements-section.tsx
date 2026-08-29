import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { StudentDashboardSection } from "@/components/student-dashboard-section";
import { useI18n } from "@/lib/i18n";
import { localeForFormatting, type Lang } from "@/lib/i18n-config";
import type { StudentProgressData } from "@/lib/student-progress";

function formatDate(iso: string, lang: Lang): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(localeForFormatting(lang), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

type StudentRecentAchievementsSectionProps = {
  progress: StudentProgressData;
  gradeSlug: string;
};

export function StudentRecentAchievementsSection({
  progress,
  gradeSlug,
}: StudentRecentAchievementsSectionProps) {
  const { tr, bi, lang } = useI18n();

  return (
    <StudentDashboardSection
      title={tr("student_dash_recent_achievements")}
      icon={<Trophy className="h-4 w-4" aria-hidden />}
      className="h-full"
    >
      {progress.recentAchievements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">{tr("student_dash_achievements_empty")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {progress.recentAchievements.map((item) => (
            <li
              key={item.kind === "certificate" ? item.certificateId : item.submissionId}
              className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {item.kind === "certificate"
                    ? tr("student_dash_achievement_certificate")
                    : tr("student_dash_achievement_quiz")}
                </p>
                <Link
                  to="/grades/$grade/$lesson"
                  params={{ grade: gradeSlug, lesson: item.lessonId }}
                  className="mt-0.5 line-clamp-2 block text-sm font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {bi(item.lessonTitle) || item.lessonTitle.en}
                </Link>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(item.at, lang)}</p>
              </div>
              <span className="shrink-0 font-display text-lg font-semibold text-foreground">{item.scorePct}%</span>
            </li>
          ))}
        </ul>
      )}
    </StudentDashboardSection>
  );
}
