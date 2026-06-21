import { Lock } from "lucide-react";
import {useI18n, L, uiBi } from "@/lib/i18n";
import { computeStudentBadges } from "@/lib/student-badges";
import type { StudentProgressData } from "@/lib/student-progress";


export function StudentBadgesSection({ progress }: { progress: StudentProgressData }) {
  const { lang } = useI18n();
  const { badges, unlockedCount, totalCount } = computeStudentBadges(progress);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="text-xl leading-none" aria-hidden>
              🏅
            </span>
          </div>
          <div>
            <h2 className="font-display text-xl text-foreground">
              {L("Achievements & Badges", "الإنجازات والشارات")[lang]}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {L(
                "Earn badges automatically as you learn and complete quizzes.",
                "اكسب الشارات تلقائيًا أثناء التعلّم وإتمام الاختبارات.",
              )[lang]}
            </p>
          </div>
        </div>
        <div className="rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
          {L("Unlocked", "مفتوحة")[lang]} {unlockedCount} / {totalCount}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => (
          <article
            key={badge.id}
            className={`relative rounded-2xl border p-5 transition-colors ${
              badge.unlocked
                ? "border-primary/25 bg-gradient-to-br from-primary/5 to-background shadow-[var(--shadow-soft)]"
                : "border-border bg-muted/40 opacity-75 grayscale"
            }`}
          >
            {!badge.unlocked && (
              <div className="absolute top-3 end-3 text-muted-foreground/80" title={L("Locked", "مقفلة")[lang]}>
                <Lock className="h-4 w-4" />
              </div>
            )}
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl text-3xl mb-4 ${
                badge.unlocked ? "bg-white/80 shadow-sm" : "bg-muted"
              }`}
              aria-hidden
            >
              {badge.icon}
            </div>
            <h3
              className={`font-display text-lg leading-snug ${
                badge.unlocked ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {uiBi(badge.title, lang)}
            </h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {uiBi(badge.description, lang)}
            </p>
            {badge.unlocked && (
              <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-primary">
                {L("Unlocked", "مفتوحة")[lang]}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
