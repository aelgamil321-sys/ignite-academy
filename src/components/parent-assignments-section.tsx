import { Link } from "@tanstack/react-router";
import { FileText, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n, type TKey } from "@/lib/i18n";
import { PARENT_NAV_ANCHORS } from "@/lib/parent-nav";
import {
  PARENT_DASH_EMPTY,
  PARENT_DASH_SECTION,
  PARENT_DASH_SECTION_LEAD,
  PARENT_DASH_SECTION_TITLE,
} from "@/lib/parent-dashboard-ui";
import { localeForFormatting, contentLocale, pickBiLocale } from "@/lib/i18n-config";
import {
  assignmentTitle,
  fetchParentChildAssignments,
  isAssignmentUpcoming,
  statusBadgeClass,
  type AssignmentWithSubmission,
} from "@/lib/assignment";

type AssignmentFilter = "submitted" | "upcoming" | "overdue";

function statusLabel(
  status: AssignmentWithSubmission["displayStatus"],
  tr: (k: import("@/lib/i18n").TKey) => string,
): string {
  switch (status) {
    case "graded":
      return tr("assignment_status_graded");
    case "submitted":
      return tr("assignment_status_submitted");
    case "late":
      return tr("assignment_status_late");
    default:
      return tr("assignment_status_missing");
  }
}

const FILTER_META: Record<AssignmentFilter, { labelKey: TKey }> = {
  submitted: { labelKey: "parent_assign_submitted" },
  upcoming: { labelKey: "parent_assign_upcoming" },
  overdue: { labelKey: "parent_assign_overdue" },
};

export function ParentAssignmentsSection({ studentUserId }: { studentUserId: string }) {
  const { tr, lang, bi } = useI18n();
  const [items, setItems] = useState<AssignmentWithSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<AssignmentFilter | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await fetchParentChildAssignments(studentUserId);
      if (!active) return;
      setItems(result.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [studentUserId]);

  const upcoming = useMemo(
    () => items.filter((a) => isAssignmentUpcoming(a, a.submission)),
    [items],
  );
  const submitted = useMemo(
    () => items.filter((a) => a.displayStatus === "submitted" || a.displayStatus === "graded"),
    [items],
  );
  const overdue = useMemo(
    () => items.filter((a) => a.displayStatus === "late" || a.displayStatus === "missing"),
    [items],
  );
  const graded = useMemo(() => items.filter((a) => a.displayStatus === "graded"), [items]);

  const counts: Record<AssignmentFilter, number> = {
    submitted: submitted.length,
    upcoming: upcoming.length,
    overdue: overdue.length,
  };

  const totalAssignments = items.length;
  const allZero = !loading && counts.submitted === 0 && counts.upcoming === 0 && counts.overdue === 0;

  const filteredList =
    activeFilter === "submitted"
      ? submitted
      : activeFilter === "upcoming"
        ? upcoming
        : activeFilter === "overdue"
          ? overdue
          : [];

  const formatDue = (iso: string) =>
    new Date(iso).toLocaleDateString(localeForFormatting(lang), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  function toggleFilter(filter: AssignmentFilter) {
    setActiveFilter((current) => (current === filter ? null : filter));
  }

  return (
    <section id={PARENT_NAV_ANCHORS.assignments} className={`scroll-mt-24 ${PARENT_DASH_SECTION}`}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-background text-primary shadow-sm">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className={PARENT_DASH_SECTION_TITLE}>{tr("parent_assignments_title")}</h2>
            <p className={PARENT_DASH_SECTION_LEAD}>{tr("parent_assignments_lead")}</p>
          </div>
        </div>
        {!loading && totalAssignments > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FILTER_META) as AssignmentFilter[]).map((filter) => {
              const count = counts[filter];
              if (count === 0) return null;
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => toggleFilter(filter)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {tr(FILTER_META[filter].labelKey)}: {count}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-foreground/60">{tr("loading")}</p>
      ) : allZero ? (
        <div className={PARENT_DASH_EMPTY}>
          <FileText className="h-3.5 w-3.5 shrink-0 text-foreground/45" aria-hidden />
          <span>{tr("parent_assignments_empty")}</span>
        </div>
      ) : null}

      {activeFilter && (
        <div className="mt-3 rounded-lg border border-border bg-background p-3">
          <h3 className="mb-2 text-xs font-semibold text-foreground">
            {tr(FILTER_META[activeFilter].labelKey)}
          </h3>
          {loading ? (
            <p className="text-sm italic text-muted-foreground">{tr("loading")}</p>
          ) : filteredList.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              {activeFilter === "submitted"
                ? tr("assignment_no_submitted")
                : activeFilter === "upcoming"
                  ? tr("assignment_no_upcoming")
                  : tr("assignment_no_late")}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredList.slice(0, 8).map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{bi(assignmentTitle(item))}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {tr("assignment_due_date")}: {formatDue(item.due_date)}
                    </div>
                    {item.displayStatus === "graded" && item.submission?.score != null && (
                      <div className="mt-0.5 text-[11px] font-semibold text-primary">
                        {tr("assignment_your_score")}: {item.submission.score}
                        {item.submission.max_points != null ? ` / ${item.submission.max_points}` : ""}
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(item.displayStatus)}`}
                  >
                    {statusLabel(item.displayStatus, tr)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {graded.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <h3 className="mb-2 text-xs font-semibold text-foreground">{tr("assignment_grade_feedback")}</h3>
          <ul className="space-y-2">
            {graded.slice(0, 3).map((item) => (
              <li key={item.id} className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2">
                <div className="text-sm font-medium">{bi(assignmentTitle(item))}</div>
                <div className="mt-0.5 font-display text-base text-primary">
                  {item.submission?.score ?? "—"}
                  {item.submission?.max_points != null ? ` / ${item.submission.max_points}` : ""}
                </div>
                {(item.submission?.feedback_en || item.submission?.feedback_ar) && (
                  <p className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground line-clamp-2">
                    {pickBiLocale(
                      {
                        en: item.submission?.feedback_en ?? "",
                        ar: item.submission?.feedback_ar ?? "",
                      },
                      contentLocale(lang),
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function StudentAssignmentsLinkCard() {
  const { tr, dir } = useI18n();
  return (
    <Link
      to="/assignments"
      className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:border-primary hover:shadow-[var(--shadow-elegant)]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-lg text-foreground">{tr("nav_assignments")}</div>
          <p className="text-sm text-muted-foreground">{tr("assignments_lead")}</p>
        </div>
      </div>
      <ArrowRight className={`h-5 w-5 shrink-0 text-primary ${dir === "rtl" ? "rotate-180" : ""}`} />
    </Link>
  );
}
