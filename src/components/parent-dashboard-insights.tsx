import { Lightbulb } from "lucide-react";
import { useI18n, L } from "@/lib/i18n";
import { buildParentInsights } from "@/lib/parent-dashboard-insights";
import type { ParentDashboardData } from "@/lib/parent-dashboard";

export function ParentDashboardInsights({ data }: { data: ParentDashboardData }) {
  const { lang } = useI18n();
  const insights = buildParentInsights(data.performanceReport, data.progress, lang);

  return (
    <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Lightbulb className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl text-foreground">
          {L("Parent Summary", "ملخص ولي الأمر")[lang]}
        </h2>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          {L(
            "Insights will appear as your child completes lessons and quizzes.",
            "ستظهر الملخصات عند إكمال الدروس والاختبارات.",
          )[lang]}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {insights.map((line) => (
            <li
              key={line}
              className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-background/80 px-4 py-3 text-sm leading-relaxed text-foreground"
            >
              <span className="mt-0.5 shrink-0 text-primary" aria-hidden>
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
