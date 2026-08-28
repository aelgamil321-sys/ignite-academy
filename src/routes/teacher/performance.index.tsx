import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchTeacherContext,
  type TeacherContext,
} from "@/lib/teacher-dashboard";
import {
  fetchTeacherAnalytics,
  teacherAllowedGradeOptions,
  teacherCanUseAnalyticsFilter,
  type TeacherAnalyticsScope,
} from "@/lib/teacher-analytics";
import {
  teacherAllowedIslamicGroupOptions,
  teacherAllowedSectionOptions,
} from "@/lib/teacher-analytics-ui";
import type { AdminAnalyticsSnapshot, AnalyticsFilters } from "@/lib/admin-analytics";
import {
  TeacherPerformanceAnalytics,
  TeacherPerformanceError,
  TeacherPerformanceLoading,
} from "@/components/teacher-performance-analytics";

export const Route = createFileRoute("/teacher/performance/")({
  component: TeacherPerformancePage,
});

const EMPTY_FILTERS: AnalyticsFilters = {
  grade: "",
  section: "",
  islamicGroup: "",
};

const selectClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm";

function TeacherPerformancePage() {
  const { lang, tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<TeacherContext | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>(EMPTY_FILTERS);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [snapshot, setSnapshot] = useState<AdminAnalyticsSnapshot | null>(null);

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

  const allowedSections = useMemo(
    () => (analyticsScope ? teacherAllowedSectionOptions(analyticsScope, filters.grade) : []),
    [analyticsScope, filters.grade],
  );

  const allowedIslamicGroups = useMemo(
    () =>
      analyticsScope
        ? teacherAllowedIslamicGroupOptions(analyticsScope, filters.grade, filters.section)
        : [],
    [analyticsScope, filters.grade, filters.section],
  );

  const loadAnalytics = useCallback(async () => {
    if (!analyticsScope) return;
    if (!teacherCanUseAnalyticsFilter(analyticsScope, filters)) {
      setSnapshot(null);
      setAnalyticsError(false);
      return;
    }
    setAnalyticsLoading(true);
    setAnalyticsError(false);
    const { data, error } = await fetchTeacherAnalytics(analyticsScope, filters);
    setAnalyticsLoading(false);
    if (error) {
      setAnalyticsError(true);
      setSnapshot(null);
      return;
    }
    setSnapshot(data);
  }, [analyticsScope, filters]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setLoading(false);
        return;
      }
      const teacherContext = await fetchTeacherContext(auth.user.id);
      setContext(teacherContext);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading) void loadAnalytics();
  }, [loading, loadAnalytics]);

  useEffect(() => {
    if (!analyticsScope) return;
    if (filters.section && !allowedSections.includes(filters.section as never)) {
      setFilters((prev) => ({ ...prev, section: "", islamicGroup: "" }));
    }
  }, [analyticsScope, allowedSections, filters.section]);

  useEffect(() => {
    if (!analyticsScope) return;
    if (filters.islamicGroup && !allowedIslamicGroups.includes(filters.islamicGroup as never)) {
      setFilters((prev) => ({ ...prev, islamicGroup: "" }));
    }
  }, [analyticsScope, allowedIslamicGroups, filters.islamicGroup]);

  if (loading) {
    return <TeacherPerformanceLoading />;
  }

  return (
    <div className="mx-auto min-w-0 max-w-[1400px] space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h3 className="mb-4 font-display text-lg text-foreground">{tr("teacher_perf_filters")}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {tr("teacher_assigned_grades")}
            </span>
            <select
              className={selectClass}
              value={filters.grade}
              onChange={(e) =>
                setFilters({ grade: e.target.value, section: "", islamicGroup: "" })
              }
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
              className={selectClass}
              value={filters.section}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, section: e.target.value, islamicGroup: "" }))
              }
              disabled={allowedSections.length === 0}
            >
              <option value="">{tr("teacher_all_sections")}</option>
              {allowedSections.map((section) => (
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
              className={selectClass}
              value={filters.islamicGroup}
              onChange={(e) => setFilters((prev) => ({ ...prev, islamicGroup: e.target.value }))}
              disabled={allowedIslamicGroups.length === 0}
            >
              <option value="">{tr("teacher_all_groups")}</option>
              {allowedIslamicGroups.map((group) => (
                <option key={group} value={group}>
                  {islamicGroupLabel(group, lang)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {analyticsLoading ? (
        <TeacherPerformanceLoading />
      ) : analyticsError ? (
        <TeacherPerformanceError onRetry={() => void loadAnalytics()} />
      ) : snapshot && analyticsScope ? (
        <TeacherPerformanceAnalytics data={snapshot} scope={analyticsScope} />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
          {tr("teacher_analytics_not_permitted")}
        </div>
      )}
    </div>
  );
}
