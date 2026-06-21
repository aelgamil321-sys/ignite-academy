import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText, ArrowRight, Loader2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { useI18n } from "@/lib/i18n";
import { localeForFormatting } from "@/lib/i18n-config";
import { supabase } from "@/integrations/supabase/client";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import {
  fetchStudentAssignments,
  statusBadgeClass,
  assignmentTitle,
  type AssignmentWithSubmission,
} from "@/lib/assignment";
import { gradeDisplayName } from "@/lib/grade-utils";

export const Route = createFileRoute("/assignments/")({
  beforeLoad: () => blockParentFromStudentRoutes(),
  head: () => ({
    meta: [
      { title: "Assignments — Ignite Islamic Academy" },
      { name: "description", content: "View and submit your Islamic Studies assignments." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AssignmentsIndexPage,
});

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

function AssignmentsIndexPage() {
  const navigate = useNavigate();
  const { tr, lang, dir, bi } = useI18n();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<AssignmentWithSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AssignmentWithSubmission["displayStatus"]>("all");

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!active) return;
      if (!auth.user) {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }
      setUserId(auth.user.id);
      const result = await fetchStudentAssignments(auth.user.id);
      if (!active) return;
      if (result.error) setError(result.error);
      else setItems(result.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((a) => a.displayStatus === filter);
  }, [items, filter]);

  const formatDue = (iso: string) =>
    new Date(iso).toLocaleString(localeForFormatting(lang), {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <PageShell
      eyebrow={tr("nav_assignments")}
      title={tr("assignments_title")}
      lead={tr("assignments_lead")}
      crumbs={[{ label: tr("nav_assignments") }]}
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "missing", "submitted", "late", "graded"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === key
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            {key === "all"
              ? tr("filter_all")
              : statusLabel(key as AssignmentWithSubmission["displayStatus"], tr)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("loading")}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title={tr("assignment_no_assignments")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => (
            <Link
              key={item.id}
              to="/assignments/$assignmentId"
              params={{ assignmentId: item.id }}
              className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] hover:border-primary hover:shadow-[var(--shadow-elegant)] transition-all flex flex-col"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="text-xs uppercase tracking-wider text-primary font-semibold">
                  {gradeDisplayName(item.grade, lang)}
                </div>
                <span
                  className={`text-xs rounded-full px-2.5 py-1 font-semibold ${statusBadgeClass(item.displayStatus)}`}
                >
                  {statusLabel(item.displayStatus, tr)}
                </span>
              </div>
              <h3 className="mt-2 font-display text-lg text-foreground leading-snug">
                {bi(assignmentTitle(item))}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {tr("assignment_due_date")}: {formatDue(item.due_date)}
              </p>
              {item.displayStatus === "graded" && item.submission?.score != null && (
                <p className="mt-1 text-sm font-semibold text-primary">
                  {tr("assignment_your_score")}: {item.submission.score}
                  {item.submission.max_points != null ? ` / ${item.submission.max_points}` : ""}
                </p>
              )}
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:text-primary">
                {tr("assignment_open")}{" "}
                <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              </div>
            </Link>
          ))}
        </div>
      )}
      {userId ? null : null}
    </PageShell>
  );
}
