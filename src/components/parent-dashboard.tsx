import { Clock3, ClipboardCheck, Award } from "lucide-react";
import { ParentDashboardHero } from "@/components/parent-dashboard-hero";
import { ParentDashboardRecommendation } from "@/components/parent-dashboard-recommendation";
import { ParentDashboardSummary, PARENT_SECTION_IDS } from "@/components/parent-dashboard-summary";
import { ParentAcademicChart } from "@/components/parent-academic-chart";
import { ParentAssignmentsSection } from "@/components/parent-assignments-section";
import { ParentDashboardInsights } from "@/components/parent-dashboard-insights";
import { ParentDashboardCertificates } from "@/components/parent-dashboard-certificates";
import { ParentDashboardBadges } from "@/components/parent-dashboard-badges";
import { useI18n, L } from "@/lib/i18n";
import type { ParentDashboardData } from "@/lib/parent-dashboard";
import type { ActivityTimelineItem } from "@/lib/student-progress";

function formatDate(iso: string, lang: "en" | "ar"): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function timelineKey(item: ActivityTimelineItem): string {
  if (item.kind === "quiz_completed") return `quiz-${item.submissionId}`;
  if (item.kind === "certificate_earned") return `cert-${item.certificateId}`;
  return `badge-${item.badgeId}-${item.at}`;
}

export function ParentDashboardView({ data }: { data: ParentDashboardData }) {
  const { lang, bi } = useI18n();
  const { progress, performanceReport } = data;

  return (
    <div className="space-y-5 sm:space-y-6">
      <ParentDashboardHero data={data} />

      <ParentDashboardRecommendation data={data} />

      <ParentDashboardSummary data={data} />

      <div className="grid gap-5 lg:grid-cols-5 lg:gap-6">
        <div
          id={PARENT_SECTION_IDS.academicPerformance}
          className="scroll-mt-24 lg:col-span-3"
        >
          <ParentAcademicChart report={performanceReport} />
        </div>
        <div
          id={PARENT_SECTION_IDS.progressReport}
          className="scroll-mt-24 lg:col-span-2"
        >
          <ParentDashboardInsights data={data} />
        </div>
      </div>

      <ParentAssignmentsSection studentUserId={data.studentUserId} />

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <div id={PARENT_SECTION_IDS.certificates} className="scroll-mt-24">
          <ParentDashboardCertificates certificates={progress.certificates} />
        </div>
        <ParentDashboardBadges progress={progress} />
      </div>

      <section className="rounded-2xl border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl text-foreground">
              {L("Recent Activity", "النشاط الأخير")[lang]}
            </h2>
            <p className="text-sm text-muted-foreground">
              {L(
                "Quiz completions, certificates, and badge milestones.",
                "إتمام الاختبارات والشهادات وإنجازات الشارات.",
              )[lang]}
            </p>
          </div>
        </div>
        {progress.activityTimeline.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            {L(
              "Activity will appear here once quizzes are submitted.",
              "سيظهر النشاط هنا بعد إرسال الاختبارات.",
            )[lang]}
          </p>
        ) : (
          <ul className="space-y-0">
            {progress.activityTimeline.map((item, index) => (
              <li key={timelineKey(item)} className="relative flex gap-4 pb-5 last:pb-0">
                {index < progress.activityTimeline.length - 1 && (
                  <span
                    className="absolute start-[1.125rem] top-10 bottom-0 w-px bg-border"
                    aria-hidden
                  />
                )}
                <div
                  className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                    item.kind === "badge_unlocked"
                      ? "border-primary/30 bg-primary/10 text-lg"
                      : item.kind === "certificate_earned"
                        ? "border-gold/30 bg-gold/10 text-gold"
                        : "border-primary/20 bg-primary/10 text-primary"
                  }`}
                >
                  {item.kind === "badge_unlocked" ? (
                    <span aria-hidden>{item.badgeIcon}</span>
                  ) : item.kind === "certificate_earned" ? (
                    <Award className="h-4 w-4" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 transition-shadow hover:shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {item.kind === "badge_unlocked"
                      ? L("Badge unlocked", "شارة مفتوحة")[lang]
                      : item.kind === "certificate_earned"
                        ? L("Certificate earned", "شهادة مكتسبة")[lang]
                        : L("Quiz completed", "اختبار مكتمل")[lang]}
                  </div>
                  <div className="mt-1 font-display text-lg leading-snug text-foreground">
                    {item.kind === "badge_unlocked"
                      ? bi(item.badgeTitle)
                      : bi(item.lessonTitle) || item.lessonTitle.en}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(item.at, lang)}</span>
                    {item.kind !== "badge_unlocked" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                        {item.scorePct}%
                      </span>
                    )}
                    {item.kind === "certificate_earned" && (
                      <span className="font-mono">{item.certificateId}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
