import { Sparkles } from "lucide-react";
import { useI18n, uiBi } from "@/lib/i18n";
import { computeStudentBadges } from "@/lib/student-badges";
import type { StudentProgressData } from "@/lib/student-progress";

export function ParentDashboardBadges({ progress }: { progress: StudentProgressData }) {
  const { tr, lang } = useI18n();
  const { badges } = computeStudentBadges(progress);

  return (
    <section className="rounded-2xl border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl text-foreground">
          {tr("parent_achievements_badges")}
        </h2>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        {badges.map((badge) => (
          <article
            key={badge.id}
            className={`rounded-2xl border p-3.5 text-center transition-all duration-300 sm:p-4 ${
              badge.unlocked
                ? "border-primary/30 bg-gradient-to-br from-primary/10 to-background shadow-sm hover:-translate-y-0.5 hover:shadow-[var(--shadow-gold)]"
                : "border-border bg-muted/30 opacity-60 grayscale"
            }`}
          >
            <div
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                badge.unlocked ? "bg-white shadow-sm" : "bg-muted"
              }`}
            >
              {badge.icon}
            </div>
            <h3 className="mt-2 font-display text-sm leading-snug text-foreground">
              {uiBi(badge.title, lang)}
            </h3>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground line-clamp-2">
              {uiBi(badge.description, lang)}
            </p>
            {!badge.unlocked && (
              <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tr("parent_badge_locked")}
              </span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
