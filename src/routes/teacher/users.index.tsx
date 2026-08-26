import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchScopedParents,
  fetchScopedStudents,
  formatStudentScopeLabel,
  type ScopedParentRow,
  type ScopedStudentRow,
} from "@/lib/teacher-dashboard";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/users/")({
  component: TeacherUsersPage,
});

function TeacherUsersPage() {
  const { tr, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<ScopedStudentRow[]>([]);
  const [parents, setParents] = useState<ScopedParentRow[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const scopedStudents = await fetchScopedStudents();
      const scopedParents = await fetchScopedParents(scopedStudents);
      setStudents(scopedStudents);
      setParents(scopedParents);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_class_users")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tr("teacher_users_desc")}</p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {tr("teacher_nav_students")} ({students.length})
        </h3>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{tr("teacher_no_students")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start">{tr("teacher_col_name")}</th>
                  <th className="px-4 py-3 text-start">{tr("teacher_col_scope")}</th>
                  <th className="px-4 py-3 text-start">{tr("teacher_col_progress")}</th>
                  <th className="px-4 py-3 text-end" />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.userId} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{s.displayName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.grade} · {formatStudentScopeLabel(s, lang)}
                    </td>
                    <td className="px-4 py-3">{s.progressPct}%</td>
                    <td className="px-4 py-3 text-end">
                      <Link
                        to="/teacher/students/$studentId"
                        params={{ studentId: s.userId }}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {tr("teacher_view_profile")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {tr("teacher_parents_section")} ({parents.length})
        </h3>
        {parents.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{tr("teacher_no_parents")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-start">{tr("teacher_parent_name")}</th>
                  <th className="px-4 py-3 text-start">{tr("teacher_parent_email")}</th>
                  <th className="px-4 py-3 text-start">{tr("teacher_linked_students")}</th>
                </tr>
              </thead>
              <tbody>
                {parents.map((p) => (
                  <tr key={p.userId} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{p.displayName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.email || "—"}</td>
                    <td className="px-4 py-3">
                      <ul className="space-y-1">
                        {p.linkedStudents.map((child) => (
                          <li key={child.userId}>
                            <Link
                              to="/teacher/students/$studentId"
                              params={{ studentId: child.userId }}
                              className="text-primary hover:underline"
                            >
                              {child.displayName}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
