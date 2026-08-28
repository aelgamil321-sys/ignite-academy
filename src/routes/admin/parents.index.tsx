import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import {
  fetchAdminParentDirectory,
  formatChildAcademics,
  type AdminParentDirectoryRow,
} from "@/lib/admin-parent-directory";
import { useI18n, L } from "@/lib/i18n";

export const Route = createFileRoute("/admin/parents/")({
  head: () => ({
    meta: [
      { title: "Parent Directory — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminParentsPage,
});

function AdminParentsPage() {
  const { tr, lang } = useI18n();
  const [rows, setRows] = useState<AdminParentDirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAdminParentDirectory().then((result) => {
      if (!active) return;
      if (result.error) {
        setError(result.error);
        setRows([]);
      } else {
        setRows(result.rows);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-10">
        <Loader2 className="h-5 w-5 animate-spin" />
        {tr("admin_parents_loading")}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        {tr("admin_parents_empty")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <section
          key={row.parentUserId}
          className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2 text-primary">
                <Users className="h-4 w-4" />
                <h2 className="font-display text-lg text-foreground">{row.parentName}</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{row.parentEmail}</p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {row.children.length} {tr("admin_parents_children_count")}
            </div>
          </div>

          {row.children.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{tr("admin_parents_no_children")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {row.children.map((child) => (
                <li
                  key={child.studentUserId}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-border/70 bg-muted/20 p-4"
                >
                  <StudentProfileAvatar
                    profilePhotoPath={child.profilePhotoPath}
                    alt={child.fullName}
                    className="h-12 w-12 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">{child.fullName}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatChildAcademics(child, lang)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {child.overallProgressPct !== null
                        ? `${tr("admin_parents_progress")}: ${child.overallProgressPct}%`
                        : tr("admin_parents_progress_unavailable")}
                      {child.averageQuizScorePct !== null
                        ? ` · ${tr("admin_parents_quiz_avg")}: ${child.averageQuizScorePct}%`
                        : ""}
                    </div>
                  </div>
                  <Link
                    to="/admin/students/$studentId"
                    params={{ studentId: child.studentUserId }}
                    className="text-sm font-semibold text-primary hover:underline shrink-0"
                  >
                    {L("View students", "عرض الطلاب")[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
