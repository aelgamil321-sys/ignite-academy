import { Clock3, ClipboardCheck, Award } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ParentDashboardHero } from "@/components/parent-dashboard-hero";
import { ParentDashboardSummary } from "@/components/parent-dashboard-summary";
import { ParentAcademicChart } from "@/components/parent-academic-chart";
import { ParentAssignmentsSection } from "@/components/parent-assignments-section";
import { ParentDashboardNeedsAttention } from "@/components/parent-dashboard-needs-attention";
import { ParentDashboardAchievements } from "@/components/parent-dashboard-achievements";
import { useI18n, uiBi } from "@/lib/i18n";
import { PARENT_NAV_ANCHORS } from "@/lib/parent-nav";
import {
  PARENT_DASH_SECTION,
  PARENT_DASH_SECTION_LEAD,
  PARENT_DASH_SECTION_TITLE,
} from "@/lib/parent-dashboard-ui";
import { localeForFormatting, type Lang } from "@/lib/i18n-config";
import { fetchParentChildAssignments } from "@/lib/assignment";
import type { ParentDashboardData } from "@/lib/parent-dashboard";
import type { ParentLinkedChild } from "@/lib/parent-children";
import type { ActivityTimelineItem } from "@/lib/student-progress";

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

function timelineKey(item: ActivityTimelineItem): string {
  if (item.kind === "quiz_completed") return `quiz-${item.submissionId}`;
  if (item.kind === "certificate_earned") return `cert-${item.certificateId}`;
  return `badge-${item.badgeId}-${item.at}`;
}

type ParentDashboardViewProps = {
  data: ParentDashboardData;
  linkedChildren?: ParentLinkedChild[];
  selectedStudentUserId?: string;
  onSelectChild?: (studentUserId: string) => void;
};

export function ParentDashboardView({
  data,
  linkedChildren,
  selectedStudentUserId,
  onSelectChild,
}: ParentDashboardViewProps) {
  const { lang, bi, tr } = useI18n();
  const { progress, performanceReport } = data;
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof fetchParentChildAssignments>>["data"]>([]);

  useEffect(() => {
    let active = true;
    setAssignmentsLoading(true);
    void (async () => {
      const result = await fetchParentChildAssignments(data.studentUserId);
      if (!active) return;
      setAssignments(result.data);
      setAssignmentsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [data.studentUserId]);

  const assignmentsNeedingAttention = useMemo(
    () =>
      assignments.filter(
        (a) => a.displayStatus === "late" || a.displayStatus === "missing",
      ).length,
    [assignments],
  );

  const recentActivity = progress.activityTimeline.slice(0, 4);

  return (
    <div className="space-y-4 sm:space-y-5">
      <ParentDashboardHero
        data={data}
        linkedChildren={linkedChildren}
        selectedStudentUserId={selectedStudentUserId}
        onSelectChild={onSelectChild}
      />

      <ParentDashboardSummary
        data={data}
        assignmentsNeedingAttention={assignmentsNeedingAttention}
        assignmentsLoading={assignmentsLoading}
      />

      <div id={PARENT_NAV_ANCHORS.progress} className="scroll-mt-24">
        <div className="grid gap-4 lg:grid-cols-5 lg:gap-5">
          <div className="lg:col-span-3">
            <ParentAcademicChart report={performanceReport} />
          </div>
          <div className="lg:col-span-2">
            <ParentDashboardNeedsAttention
              data={data}
              assignments={assignments}
              loading={assignmentsLoading}
            />
          </div>
        </div>
      </div>

      <ParentAssignmentsSection studentUserId={data.studentUserId} />

      <ParentDashboardAchievements progress={progress} studentUserId={data.studentUserId} />

      {recentActivity.length > 0 ? (
        <section className={PARENT_DASH_SECTION}>
          <div className="mb-2 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" aria-hidden />
            <div>
              <h2 className={PARENT_DASH_SECTION_TITLE}>{tr("parent_recent_activity")}</h2>
              <p className={PARENT_DASH_SECTION_LEAD}>{tr("parent_recent_activity_lead")}</p>
            </div>
          </div>
          <ul className="space-y-2">
            {recentActivity.map((item) => (
              <li
                key={timelineKey(item)}
                className="flex items-start gap-3 rounded-md border border-border/80 bg-background px-3 py-2.5 shadow-sm"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm ${
                    item.kind === "badge_unlocked"
                      ? "border-primary/30 bg-primary/10"
                      : item.kind === "certificate_earned"
                        ? "border-gold/30 bg-gold/10 text-gold"
                        : "border-primary/20 bg-primary/10 text-primary"
                  }`}
                >
                  {item.kind === "badge_unlocked" ? (
                    <span aria-hidden>{item.badgeIcon}</span>
                  ) : item.kind === "certificate_earned" ? (
                    <Award className="h-3.5 w-3.5" />
                  ) : (
                    <ClipboardCheck className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {item.kind === "badge_unlocked"
                      ? tr("parent_badge_unlocked")
                      : item.kind === "certificate_earned"
                        ? tr("parent_certificate_earned")
                        : tr("parent_quiz_completed")}
                  </div>
                  <div className="text-sm font-medium leading-snug text-foreground">
                    {item.kind === "badge_unlocked"
                      ? uiBi(item.badgeTitle, lang)
                      : bi(item.lessonTitle) || item.lessonTitle.en}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{formatDate(item.at, lang)}</span>
                    {item.kind !== "badge_unlocked" ? (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                        {item.scorePct}%
                      </span>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
