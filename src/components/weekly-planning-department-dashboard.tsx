import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminTableScroll } from "@/components/admin-table-scroll";
import { WeeklyPlanStatusBadge } from "@/components/weekly-plan-completion-panel";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import {
  formatWeeklyPlanSectionCodes,
  WEEKLY_PLAN_CORE_PLANNING_MAX,
  WEEKLY_PLAN_DIFFERENTIATION_MAX,
  WEEKLY_PLAN_PERIOD_MAX,
  WEEKLY_PLAN_REFLECTION_MAX,
} from "@/lib/weekly-planning";
import {
  departmentFilterOptions,
  filterDepartmentTrackerRows,
  fetchDepartmentWeeklyPlanningSnapshot,
  WEEKLY_PLANNING_WEEKS,
  type DepartmentDashboardFilters,
  type DepartmentWeeklyPlanningSnapshot,
} from "@/lib/weekly-planning-dashboard";

const selectClass = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm sm:w-auto";

type WeeklyPlanningDepartmentDashboardProps = {
  reviewPlanPath: (planId: string) => string;
};

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl text-foreground">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function WeeklyPlanningDepartmentDashboard({
  reviewPlanPath,
}: WeeklyPlanningDepartmentDashboardProps) {
  const { lang, tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<DepartmentWeeklyPlanningSnapshot | null>(null);
  const [filters, setFilters] = useState<DepartmentDashboardFilters>({});

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await fetchDepartmentWeeklyPlanningSnapshot();
        setSnapshot(data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const options = useMemo(
    () => (snapshot ? departmentFilterOptions(snapshot) : null),
    [snapshot],
  );

  const filteredRows = useMemo(
    () => (snapshot ? filterDepartmentTrackerRows(snapshot.trackerRows, filters) : []),
    [snapshot, filters],
  );

  const setFilter = (key: keyof DepartmentDashboardFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  if (!snapshot || snapshot.teachers.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {tr("wp_dept_empty_teachers")}
      </div>
    );
  }

  const m = snapshot.metrics;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground">{tr("wp_dept_title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tr("wp_dept_lead")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label={tr("wp_dept_total_teachers")} value={m.totalTeachers} />
        <MetricCard label={tr("wp_dept_total_plans")} value={m.totalWeeklyPlans} />
        <MetricCard label={tr("wp_status_complete")} value={m.completed} />
        <MetricCard label={tr("wp_status_in_progress")} value={m.inProgress} />
        <MetricCard label={tr("wp_status_not_started")} value={m.notStarted} />
        <MetricCard label={tr("wp_dept_overall_completion")} value={`${m.overallCompletionPct}%`} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] space-y-3">
        <h3 className="font-display text-lg text-foreground">{tr("wp_dept_category_avg")}</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{tr("wp_completion_core")}</p>
            <ProgressBar value={m.avgCorePlanning} max={WEEKLY_PLAN_CORE_PLANNING_MAX} />
            <p className="text-xs mt-1">{m.avgCorePlanning.toFixed(1)} / {WEEKLY_PLAN_CORE_PLANNING_MAX}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{tr("wp_completion_diff")}</p>
            <ProgressBar value={m.avgDifferentiation} max={WEEKLY_PLAN_DIFFERENTIATION_MAX} />
            <p className="text-xs mt-1">{m.avgDifferentiation.toFixed(1)} / {WEEKLY_PLAN_DIFFERENTIATION_MAX}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{tr("wp_completion_first")}</p>
            <ProgressBar value={m.avgFirstPeriod} max={WEEKLY_PLAN_PERIOD_MAX} />
            <p className="text-xs mt-1">{m.avgFirstPeriod.toFixed(1)} / {WEEKLY_PLAN_PERIOD_MAX}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{tr("wp_completion_second")}</p>
            <ProgressBar value={m.avgSecondPeriod} max={WEEKLY_PLAN_PERIOD_MAX} />
            <p className="text-xs mt-1">{m.avgSecondPeriod.toFixed(1)} / {WEEKLY_PLAN_PERIOD_MAX}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{tr("wp_completion_reflection")}</p>
            <ProgressBar value={m.avgReflection} max={WEEKLY_PLAN_REFLECTION_MAX} />
            <p className="text-xs mt-1">{m.avgReflection.toFixed(1)} / {WEEKLY_PLAN_REFLECTION_MAX}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-lg text-foreground mb-3">{tr("wp_dept_teacher_summary")}</h3>
        <AdminTableScroll>
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="p-2">{tr("wp_field_teacher")}</th>
                <th className="p-2">{tr("wp_dept_assigned_grades")}</th>
                <th className="p-2">{tr("wp_dept_expected")}</th>
                <th className="p-2">{tr("wp_dept_created")}</th>
                <th className="p-2">{tr("wp_status_complete")}</th>
                <th className="p-2">{tr("wp_status_in_progress")}</th>
                <th className="p-2">{tr("wp_status_not_started")}</th>
                <th className="p-2">{tr("wp_dept_overall_completion")}</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.teacherSummaries.map((row) => (
                <tr key={row.teacher_id} className="border-b border-border/60 hover:bg-muted/30">
                  <td className="p-2">
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => setFilter("teacherId", row.teacher_id)}
                    >
                      {row.teacherName}
                    </button>
                  </td>
                  <td className="p-2">{row.assignedGrades.map((g) => gradeDisplayName(g, lang)).join(", ")}</td>
                  <td className="p-2">{row.plansExpected}</td>
                  <td className="p-2">{row.plansCreated}</td>
                  <td className="p-2">{row.completed}</td>
                  <td className="p-2">{row.inProgress}</td>
                  <td className="p-2">{row.notStarted}</td>
                  <td className="p-2">{row.overallCompletionPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-lg text-foreground mb-3">{tr("wp_dept_week_grid")}</h3>
        <div className="flex flex-wrap gap-1 text-center text-[10px]">
          {snapshot.weekSnapshots.map((w) => {
            const pct =
              w.expected > 0 ? Math.round(((w.completed + w.inProgress * 0.5) / w.expected) * 100) : 0;
            const color =
              w.notStarted === w.expected
                ? "bg-red-100 text-red-800 border-red-200"
                : w.completed === w.expected
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : "bg-amber-100 text-amber-900 border-amber-200";
            return (
              <button
                key={w.week_number}
                type="button"
                title={`Week ${w.week_number}: ${w.completed} complete, ${w.inProgress} in progress, ${w.notStarted} not started`}
                className={`rounded border px-1 py-2 ${color}`}
                onClick={() => setFilter("week", String(w.week_number))}
              >
                <div className="font-semibold">{w.week_number}</div>
                <div>{pct}%</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] space-y-3">
        <h3 className="font-display text-lg text-foreground">{tr("wp_dept_filters")}</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <select className={selectClass} value={filters.teacherId ?? ""} onChange={(e) => setFilter("teacherId", e.target.value)}>
            <option value="">{tr("wp_dept_filter_all_teachers")}</option>
            {options?.teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select className={selectClass} value={filters.week ?? ""} onChange={(e) => setFilter("week", e.target.value)}>
            <option value="">{tr("wp_filter_all_weeks")}</option>
            {Array.from({ length: WEEKLY_PLANNING_WEEKS }, (_, i) => i + 1).map((w) => (
              <option key={w} value={String(w)}>{tr("wp_week_n").replace("{n}", String(w))}</option>
            ))}
          </select>
          <select className={selectClass} value={filters.grade ?? ""} onChange={(e) => setFilter("grade", e.target.value)}>
            <option value="">{tr("wp_filter_all_grades")}</option>
            {options?.grades.map((g) => (
              <option key={g} value={g}>{gradeDisplayName(g, lang)}</option>
            ))}
          </select>
          <select className={selectClass} value={filters.section ?? ""} onChange={(e) => setFilter("section", e.target.value)}>
            <option value="">{tr("wp_filter_all_sections")}</option>
            {options?.sections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select className={selectClass} value={filters.islamicGroup ?? ""} onChange={(e) => setFilter("islamicGroup", e.target.value)}>
            <option value="">{tr("wp_dept_filter_all_groups")}</option>
            {options?.islamicGroupOptions.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select className={selectClass} value={filters.status ?? ""} onChange={(e) => setFilter("status", e.target.value)}>
            <option value="">{tr("wp_filter_all_status")}</option>
            <option value="not_started">{tr("wp_status_not_started")}</option>
            <option value="in_progress">{tr("wp_status_in_progress")}</option>
            <option value="complete">{tr("wp_status_complete")}</option>
          </select>
          <select className={selectClass} value={filters.domain ?? ""} onChange={(e) => setFilter("domain", e.target.value)}>
            <option value="">{tr("wp_dept_filter_all_domains")}</option>
            {options?.domains.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select className={selectClass} value={filters.unit ?? ""} onChange={(e) => setFilter("unit", e.target.value)}>
            <option value="">{tr("wp_dept_filter_all_units")}</option>
            {options?.units.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => setFilters({})}
          >
            {tr("wp_dept_clear_filters")}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-display text-lg text-foreground">{tr("wp_dept_tracker")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{tr("wp_dept_tracker_hint")}</p>
        </div>
        {filteredRows.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground italic">{tr("wp_dept_no_results")}</p>
        ) : (
          <AdminTableScroll>
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-3">{tr("wp_field_week")}</th>
                  <th className="p-3">{tr("wp_field_teacher")}</th>
                  <th className="p-3">{tr("wp_field_grade")}</th>
                  <th className="p-3">{tr("wp_dept_section_coverage")}</th>
                  <th className="p-3">{tr("wp_field_islamic_group")}</th>
                  <th className="p-3">{tr("wp_field_date")}</th>
                  <th className="p-3">{tr("wp_field_domain")}</th>
                  <th className="p-3">{tr("wp_field_unit")}</th>
                  <th className="p-3">{tr("wp_field_lesson_title")}</th>
                  <th className="p-3">{tr("wp_col_completion")}</th>
                  <th className="p-3">{tr("wp_col_status")}</th>
                  <th className="p-3">{tr("wp_dept_next_action")}</th>
                  <th className="p-3">{tr("wp_col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.rowKey} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="p-3">{row.week_number}</td>
                    <td className="p-3">{row.teacherName}</td>
                    <td className="p-3">{gradeDisplayName(row.grade, lang)}</td>
                    <td className="p-3 text-xs leading-relaxed">
                      <div>
                        <span className="text-muted-foreground">{tr("wp_dept_sections_expected")}: </span>
                        {formatWeeklyPlanSectionCodes(row.expectedSections, lang)}
                      </div>
                      {row.isSubmitted ? (
                        <>
                          <div>
                            <span className="text-muted-foreground">{tr("wp_dept_sections_covered")}: </span>
                            {formatWeeklyPlanSectionCodes(row.coveredSections, lang)}
                          </div>
                          {row.missingSections.length > 0 ? (
                            <div className="text-amber-800 dark:text-amber-200">
                              <span className="text-muted-foreground">{tr("wp_dept_sections_missing")}: </span>
                              {formatWeeklyPlanSectionCodes(row.missingSections, lang)}
                            </div>
                          ) : null}
                        </>
                      ) : null}
                    </td>
                    <td className="p-3">{row.islamic_group ?? "—"}</td>
                    <td className="p-3">{row.plan_date ?? "—"}</td>
                    <td className="p-3 max-w-[120px] truncate">{row.domain ?? "—"}</td>
                    <td className="p-3 max-w-[120px] truncate">{row.unit ?? "—"}</td>
                    <td className="p-3 max-w-[160px] truncate">{row.lesson_title ?? "—"}</td>
                    <td className="p-3">{Math.round(row.completion.percentage * 100)}%</td>
                    <td className="p-3"><WeeklyPlanStatusBadge status={row.status} /></td>
                    <td className="p-3 max-w-[140px] text-xs text-muted-foreground">{tr(row.nextActionKey)}</td>
                    <td className="p-3">
                      {row.contributingPlanIds.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {row.contributingPlanIds.map((id, index) => (
                            <Link
                              key={id}
                              to={reviewPlanPath(id)}
                              className="text-sm font-semibold text-primary hover:underline"
                            >
                              {row.contributingPlanIds.length > 1
                                ? tr("wp_dept_view_plan_n").replace("{n}", String(index + 1))
                                : tr("wp_dept_view_plan")}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableScroll>
        )}
      </section>
    </div>
  );
}
