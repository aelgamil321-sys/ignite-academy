import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  fetchScopedStudents,
  studentMatchesClassFilter,
  formatStudentScopeLabel,
  type ScopedStudentRow,
} from "@/lib/teacher-dashboard";
import { gradeDisplayName } from "@/lib/grade-utils";

export const Route = createFileRoute("/teacher/students/")({
  validateSearch: (s: Record<string, unknown>) => ({
    grade: typeof s.grade === "string" ? s.grade : "",
    section: typeof s.section === "string" ? s.section : "",
    islamic_group: typeof s.islamic_group === "string" ? s.islamic_group : "",
  }),
  component: TeacherStudentsPage,
});

function TeacherStudentsPage() {
  const { lang, tr } = useI18n();
  const { grade, section, islamic_group } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<ScopedStudentRow[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const rows = await fetchScopedStudents();
      setStudents(rows);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!grade && !section && !islamic_group) return students;
    return students.filter((s) =>
      studentMatchesClassFilter(s, {
        grade: grade || undefined,
        section: (section || "") as ScopedStudentRow["section"] | "",
        islamic_group: (islamic_group || "") as ScopedStudentRow["islamic_group"] | "",
      }),
    );
  }, [students, grade, section, islamic_group]);

  const filterLabel =
    grade
      ? `${gradeDisplayName(grade, lang)}${section ? ` · ${section}` : ""}${islamic_group ? ` · ${islamic_group}` : ""}`
      : null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_students")}</h2>
        {filterLabel && (
          <p className="text-sm text-muted-foreground mt-1">
            {tr("teacher_filtered_by")}: {filterLabel}
          </p>
        )}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("teacher_no_students")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="p-3 font-medium">{tr("teacher_col_name")}</th>
                <th className="p-3 font-medium">{tr("teacher_col_scope")}</th>
                <th className="p-3 font-medium">{tr("teacher_col_progress")}</th>
                <th className="p-3 font-medium">{tr("teacher_col_avg_quiz")}</th>
                <th className="p-3 font-medium">{tr("teacher_col_certificates")}</th>
                <th className="p-3 font-medium">{tr("teacher_col_lessons")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.userId} className="border-b border-border/70 last:border-0">
                  <td className="p-3">
                    <Link
                      to="/teacher/students/$studentId"
                      params={{ studentId: s.userId }}
                      className="font-medium text-primary hover:underline"
                    >
                      {s.displayName}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {formatStudentScopeLabel(s, lang)}
                  </td>
                  <td className="p-3">{s.progressPct}%</td>
                  <td className="p-3">{s.avgQuizScore === null ? "—" : `${s.avgQuizScore}%`}</td>
                  <td className="p-3">{s.certificatesCount}</td>
                  <td className="p-3">{s.completedLessons}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
