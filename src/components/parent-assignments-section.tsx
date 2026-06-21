import { Link } from "@tanstack/react-router";
import { FileText, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n, L } from "@/lib/i18n";
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

const FILTER_META: Record<
  AssignmentFilter,
  { emoji: string; labelEn: string; labelAr: string; ring: string; active: string }
> = {
  submitted: {
    emoji: "🟢",
    labelEn: "Submitted",
    labelAr: "تم التسليم",
    ring: "ring-emerald-500/30",
    active: "border-emerald-500/50 bg-emerald-500/8 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.35)]",
  },
  upcoming: {
    emoji: "🟡",
    labelEn: "Upcoming",
    labelAr: "قادمة",
    ring: "ring-amber-500/30",
    active: "border-amber-500/50 bg-amber-500/8 shadow-[0_8px_24px_-8px_rgba(245,158,11,0.35)]",
  },
  overdue: {
    emoji: "🔴",
    labelEn: "Overdue",
    labelAr: "متأخرة",
    ring: "ring-red-500/30",
    active: "border-red-500/50 bg-red-500/8 shadow-[0_8px_24px_-8px_rgba(239,68,68,0.35)]",
  },
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

  const filteredList =
    activeFilter === "submitted"
      ? submitted
      : activeFilter === "upcoming"
        ? upcoming
        : activeFilter === "overdue"
          ? overdue
          : [];

  const formatDue = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  function toggleFilter(filter: AssignmentFilter) {
    setActiveFilter((current) => (current === filter ? null : filter));
  }

  return (
    <section className="rounded-2xl border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display text-xl text-foreground">{tr("parent_assignments_title")}</h2>
          <p className="text-sm text-muted-foreground">{tr("parent_assignments_lead")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(FILTER_META) as AssignmentFilter[]).map((filter) => {
          const meta = FILTER_META[filter];
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => toggleFilter(filter)}
              className={`group rounded-2xl border p-4 text-start transition-all duration-300 hover:-translate-y-0.5 ${
                isActive
                  ? `${meta.active} ring-2 ${meta.ring}`
                  : "border-border bg-background hover:border-primary/25 hover:shadow-[var(--shadow-soft)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl" aria-hidden>
                  {meta.emoji}
                </span>
                <span className="font-display text-3xl leading-none text-foreground">
                  {loading ? "…" : counts[filter]}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">
                {lang === "ar" ? meta.labelAr : meta.labelEn}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {L("Tap to view details", "اضغط لعرض التفاصيل")[lang]}
              </div>
            </button>
          );
        })}
      </div>

      {activeFilter && (
        <div className="mt-4 rounded-2xl border border-border bg-background p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            {lang === "ar"
              ? FILTER_META[activeFilter].labelAr
              : FILTER_META[activeFilter].labelEn}
          </h3>
          {loading ? (
            <p className="text-sm italic text-muted-foreground">{tr("loading")}</p>
          ) : filteredList.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">
              {activeFilter === "submitted"
                ? tr("assignment_no_submitted")
                : activeFilter === "upcoming"
                  ? tr("assignment_no_upcoming")
                  : tr("assignment_no_late")}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredList.slice(0, 10).map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{bi(assignmentTitle(item))}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {tr("assignment_due_date")}: {formatDue(item.due_date)}
                    </div>
                    {item.displayStatus === "graded" && item.submission?.score != null && (
                      <div className="mt-1 text-xs font-semibold text-primary">
                        {tr("assignment_your_score")}: {item.submission.score}
                        {item.submission.max_points != null ? ` / ${item.submission.max_points}` : ""}
                      </div>
                    )}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(item.displayStatus)}`}
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
        <div className="mt-5 border-t border-border pt-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{tr("assignment_grade_feedback")}</h3>
          <ul className="space-y-3">
            {graded.slice(0, 5).map((item) => (
              <li key={item.id} className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="text-sm font-medium">{bi(assignmentTitle(item))}</div>
                <div className="mt-1 font-display text-lg text-primary">
                  {item.submission?.score ?? "—"}
                  {item.submission?.max_points != null ? ` / ${item.submission.max_points}` : ""}
                </div>
                {(item.submission?.feedback_en || item.submission?.feedback_ar) && (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                    {lang === "ar"
                      ? item.submission?.feedback_ar || item.submission?.feedback_en
                      : item.submission?.feedback_en || item.submission?.feedback_ar}
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
