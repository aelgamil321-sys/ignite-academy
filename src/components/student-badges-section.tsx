import { Lock } from "lucide-react";
import { StudentDashboardSection } from "@/components/student-dashboard-section";
import { useI18n, uiBi } from "@/lib/i18n";
import { computeStudentBadges } from "@/lib/student-badges";
import type { StudentProgressData } from "@/lib/student-progress";
import { cn } from "@/lib/utils";

export function StudentBadgesSection({ progress }: { progress: StudentProgressData }) {
  const { tr, lang } = useI18n();
  const { badges, unlockedCount, totalCount } = computeStudentBadges(progress);

  return (
    <StudentDashboardSection
      title={tr("student_dash_badges_title")}
      lead={tr("student_dash_badges_lead")}
      icon={<span className="text-base leading-none" aria-hidden>🏅</span>}
      action={
        <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {tr("student_dash_badges_unlocked")} {unlockedCount} / {totalCount}
        </span>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => (
          <article
            key={badge.id}
            className={cn(
              "relative rounded-xl border p-3.5 transition-colors sm:p-4",
              badge.unlocked
                ? "border-primary/30 bg-gradient-to-br from-primary/8 to-background shadow-[var(--shadow-soft)]"
                : "border-border/70 bg-muted/25",
            )}
          >
            {!badge.unlocked ? (
              <div
                className="absolute top-2.5 end-2.5 text-muted-foreground/70"
                title={tr("student_dash_badge_locked")}
              >
                <Lock className="h-3.5 w-3.5" aria-hidden />
              </div>
            ) : null}
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl",
                  badge.unlocked ? "bg-white/90 shadow-sm ring-1 ring-primary/20" : "bg-muted/60 grayscale",
                )}
                aria-hidden
              >
                {badge.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className={cn(
                    "font-display text-sm font-semibold leading-snug sm:text-base",
                    badge.unlocked ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {uiBi(badge.title, lang)}
                </h3>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {uiBi(badge.description, lang)}
                </p>
                {badge.unlocked ? (
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {tr("student_dash_badge_unlocked")}
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </StudentDashboardSection>
  );
}
