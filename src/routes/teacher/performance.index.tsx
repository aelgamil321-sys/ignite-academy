import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  islamicGroupLabel,
  sectionLabel,
} from "@/lib/student-academics";
import {
  fetchScopedStudents,
  fetchTeacherContext,
  type TeacherContext,
} from "@/lib/teacher-dashboard";
import {
  fetchTeacherAnalytics,
  teacherAllowedGradeOptions,
  teacherCanUseAnalyticsFilter,
  type TeacherAnalyticsScope,
} from "@/lib/teacher-analytics";
import type { AnalyticsFilters } from "@/lib/admin-analytics";

export const Route = createFileRoute("/teacher/performance/")({
  component: TeacherPerformancePage,
});

const EMPTY_FILTERS: AnalyticsFilters = {
  grade: "",
  section: "",
  islamicGroup: "",
};

function TeacherPerformancePage() {
  const { lang, tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchScopedStudents>>>([]);
  const [context, setContext] = useState<TeacherContext | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>(EMPTY_FILTERS);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [summary, setSummary] = useState<{
    studentCount: number;
    submissionCount: number;
    certificateCount: number;
    averageScorePct: number | null;
  } | null>(null);

  const analyticsScope: TeacherAnalyticsScope | null = useMemo(
    () =>
      context
        ? { isLeadTeacher: context.isLeadTeacher, assignments: context.assignments }
        : null,
    [context],
  );

  const allowedGrades = useMemo(
    () => (analyticsScope ? teacherAllowedGradeOptions(analyticsScope) : []),
    [analyticsScope],
  );

  const loadAnalytics = useCallback(async () => {
    if (!analyticsScope) return;
    if (!teacherCanUseAnalyticsFilter(analyticsScope, filters)) {
      setSummary(null);
      return;
    }
    setAnalyticsLoading(true);
    const { data, error } = await fetchTeacherAnalytics(analyticsScope, filters);
    setAnalyticsLoading(false);
    if (error) {
      toast.error(error);
      setSummary(null);
      return;
    }
    setSummary(data?.summary ?? null);
  }, [analyticsScope, filters]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const [studentRows, teacherContext] = await Promise.all([
        fetchScopedStudents(),
        fetchTeacherContext(auth.user.id),
      ]);
      setStudents(studentRows);
      setContext(teacherContext);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading) void loadAnalytics();
  }, [loading, loadAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_performance")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tr("teacher_scope_lead")}</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] space-y-4">
        <h3 className="font-display text-lg">{tr("teacher_analytics_summary")}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {tr("teacher_assigned_grades")}
            </span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={filters.grade}
              onChange={(e) => setFilters((prev) => ({ ...prev, grade: e.target.value }))}
            >
              <option value="">{tr("teacher_all_grades")}</option>
              {allowedGrades.map((grade) => (
                <option key={grade} value={grade}>
                  {gradeDisplayName(grade, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {tr("teacher_assigned_sections")}
            </span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={filters.section}
              onChange={(e) => setFilters((prev) => ({ ...prev, section: e.target.value }))}
            >
              <option value="">{tr("teacher_all_sections")}</option>
              {STUDENT_SECTIONS.map((section) => (
                <option key={section} value={section}>
                  {sectionLabel(section, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {tr("teacher_assigned_groups")}
            </span>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={filters.islamicGroup}
              onChange={(e) => setFilters((prev) => ({ ...prev, islamicGroup: e.target.value }))}
            >
              <option value="">{tr("teacher_all_groups")}</option>
              {ISLAMIC_GROUPS.map((group) => (
                <option key={group} value={group}>
                  {islamicGroupLabel(group, lang)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {analyticsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tr("teacher_loading")}
          </div>
        ) : summary ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase text-muted-foreground">{tr("teacher_stat_students")}</p>
              <p className="font-display text-2xl">{summary.studentCount}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase text-muted-foreground">{tr("teacher_stat_submitted")}</p>
              <p className="font-display text-2xl">{summary.submissionCount}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase text-muted-foreground">{tr("teacher_col_certificates")}</p>
              <p className="font-display text-2xl">{summary.certificateCount}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase text-muted-foreground">{tr("teacher_stat_avg_quiz")}</p>
              <p className="font-display text-2xl">
                {summary.averageScorePct === null ? "—" : `${summary.averageScorePct}%`}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{tr("teacher_analytics_not_permitted")}</p>
        )}
      </section>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-3 font-medium">{tr("teacher_col_name")}</th>
              <th className="p-3 font-medium">{tr("teacher_col_progress")}</th>
              <th className="p-3 font-medium">{tr("teacher_col_avg_quiz")}</th>
              <th className="p-3 font-medium">{tr("teacher_col_certificates")}</th>
              <th className="p-3 font-medium">{tr("teacher_col_lessons")}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
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
                <td className="p-3">{s.progressPct}%</td>
                <td className="p-3">{s.avgQuizScore === null ? "—" : `${s.avgQuizScore}%`}</td>
                <td className="p-3">{s.certificatesCount}</td>
                <td className="p-3">{s.completedLessons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
