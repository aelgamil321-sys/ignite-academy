import { AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  assignmentTitle,
  isAssignmentUpcoming,
  type AssignmentWithSubmission,
} from "@/lib/assignment";
import { resolveParentRecommendation } from "@/lib/parent-dashboard-insights";
import type { ParentDashboardData } from "@/lib/parent-dashboard";
import {
  PARENT_DASH_SECTION,
  PARENT_DASH_SECTION_LEAD,
  PARENT_DASH_SECTION_TITLE,
} from "@/lib/parent-dashboard-ui";
import { localeForFormatting } from "@/lib/i18n-config";

type AttentionItem = {
  key: string;
  tone: "warning" | "info";
  title: string;
  detail?: string;
};

function buildAttentionItems(
  data: ParentDashboardData,
  assignments: AssignmentWithSubmission[],
  tr: (k: import("@/lib/i18n").TKey) => string,
  trf: (k: import("@/lib/i18n").TKey, v: Record<string, string | number>) => string,
  bi: (v: { en: string; ar: string }) => string,
  lang: string,
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const { progress, performanceReport: report } = data;

  const overdue = assignments.filter(
    (a) => a.displayStatus === "late" || a.displayStatus === "missing",
  );
  const upcoming = assignments.filter((a) => isAssignmentUpcoming(a, a.submission));

  for (const item of overdue.slice(0, 3)) {
    items.push({
      key: `overdue-${item.id}`,
      tone: "warning",
      title: bi(assignmentTitle(item)),
      detail: tr("parent_assign_overdue"),
    });
  }

  if (items.length < 4) {
    for (const item of upcoming.slice(0, 2)) {
      items.push({
        key: `upcoming-${item.id}`,
        tone: "info",
        title: bi(assignmentTitle(item)),
        detail: new Date(item.due_date).toLocaleDateString(localeForFormatting(lang as "en" | "ar"), {
          month: "short",
          day: "numeric",
        }),
      });
    }
  }

  const average = report.averageQuizScorePct ?? progress.averageQuizScorePct;
  const { tier, message } = resolveParentRecommendation(average, tr);
  if (tier === "needs_support") {
    items.push({
      key: "rec-support",
      tone: "warning",
      title: tr("parent_kpi_attention"),
      detail: message,
    });
  } else if (tier === "no_data" && report.totalQuizSubmissions === 0) {
    items.push({
      key: "rec-no-data",
      tone: "info",
      title: tr("parent_rec_tier_awaiting"),
      detail: message,
    });
  }

  if (
    progress.totalLessons > 0 &&
    progress.completedLessons === 0 &&
    progress.overallProgressPct === 0
  ) {
    items.push({
      key: "no-lessons",
      tone: "info",
      title: tr("parent_kpi_no_lessons_completed"),
      detail: trf("parent_kpi_lessons_available", { n: progress.totalLessons }),
    });
  }

  return items.slice(0, 5);
}

export function ParentDashboardNeedsAttention({
  data,
  assignments,
  loading,
}: {
  data: ParentDashboardData;
  assignments: AssignmentWithSubmission[];
  loading: boolean;
}) {
  const { tr, trf, bi, lang } = useI18n();
  const items = buildAttentionItems(data, assignments, tr, trf, bi, lang);

  return (
    <section className={`flex h-full flex-col ${PARENT_DASH_SECTION}`}>
      <div className="mb-2 flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-primary shadow-sm">
          <ClipboardList className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className={PARENT_DASH_SECTION_TITLE}>{tr("parent_needs_attention_title")}</h2>
          <p className={PARENT_DASH_SECTION_LEAD}>{tr("parent_needs_attention_lead")}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-foreground/60">{tr("loading")}</p>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-md border border-dashed border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-sm font-medium text-foreground">{tr("parent_everything_good")}</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.key}
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                item.tone === "warning"
                  ? "border-amber-500/30 bg-amber-500/6"
                  : "border-border/80 bg-background"
              }`}
            >
              <AlertCircle
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  item.tone === "warning" ? "text-amber-600" : "text-foreground/50"
                }`}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="font-medium leading-snug text-foreground">{item.title}</div>
                {item.detail ? (
                  <div className="mt-0.5 text-xs text-foreground/60">{item.detail}</div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
