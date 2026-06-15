import { Link } from "@tanstack/react-router";
import { FileText, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  assignmentTitle,
  fetchParentChildAssignments,
  isAssignmentUpcoming,
  statusBadgeClass,
  type AssignmentWithSubmission,
} from "@/lib/assignment";

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

export function ParentAssignmentsSection({ studentUserId }: { studentUserId: string }) {
  const { tr, lang, dir, bi } = useI18n();
  const [items, setItems] = useState<AssignmentWithSubmission[]>([]);
  const [loading, setLoading] = useState(true);

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
  const missing = useMemo(() => items.filter((a) => a.displayStatus === "missing"), [items]);
  const late = useMemo(() => items.filter((a) => a.displayStatus === "late"), [items]);
  const graded = useMemo(() => items.filter((a) => a.displayStatus === "graded"), [items]);

  const formatDue = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  function renderList(list: AssignmentWithSubmission[], empty: string) {
    if (loading) {
      return <p className="text-sm text-muted-foreground italic">{tr("loading")}</p>;
    }
    if (list.length === 0) {
      return <p className="text-sm text-muted-foreground italic">{empty}</p>;
    }
    return (
      <ul className="space-y-2">
        {list.slice(0, 8).map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-4 py-3"
          >
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{bi(assignmentTitle(item))}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {tr("assignment_due_date")}: {formatDue(item.due_date)}
              </div>
              {item.displayStatus === "graded" && item.submission?.score != null && (
                <div className="text-xs text-primary font-semibold mt-1">
                  {tr("assignment_your_score")}: {item.submission.score}
                  {item.submission.max_points != null ? ` / ${item.submission.max_points}` : ""}
                </div>
              )}
            </div>
            <span
              className={`text-xs rounded-full px-2 py-0.5 font-semibold shrink-0 ${statusBadgeClass(item.displayStatus)}`}
            >
              {statusLabel(item.displayStatus, tr)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl text-foreground">{tr("parent_assignments_title")}</h2>
            <p className="text-sm text-muted-foreground">{tr("parent_assignments_lead")}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">{tr("assignment_upcoming")}</h3>
          {renderList(upcoming, tr("assignment_no_upcoming"))}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">{tr("assignment_status_submitted")}</h3>
          {renderList(submitted, tr("assignment_no_submitted"))}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">{tr("assignment_status_missing")}</h3>
          {renderList(missing, tr("assignment_no_missing"))}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">{tr("assignment_status_late")}</h3>
          {renderList(late, tr("assignment_no_late"))}
        </div>
      </div>

      {graded.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">{tr("assignment_grade_feedback")}</h3>
          <ul className="space-y-3">
            {graded.slice(0, 5).map((item) => (
              <li key={item.id} className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="font-medium text-sm">{bi(assignmentTitle(item))}</div>
                <div className="text-lg font-display text-primary mt-1">
                  {item.submission?.score ?? "—"}
                  {item.submission?.max_points != null ? ` / ${item.submission.max_points}` : ""}
                </div>
                {(item.submission?.feedback_en || item.submission?.feedback_ar) && (
                  <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
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
      className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] hover:border-primary hover:shadow-[var(--shadow-elegant)] transition-all flex items-center justify-between gap-4"
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
      <ArrowRight className={`h-5 w-5 text-primary shrink-0 ${dir === "rtl" ? "rotate-180" : ""}`} />
    </Link>
  );
}
