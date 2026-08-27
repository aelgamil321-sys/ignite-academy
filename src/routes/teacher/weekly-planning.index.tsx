import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, Loader2, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WeeklyPlanSectionMultiSelect } from "@/components/weekly-plan-section-multi-select";
import { WeeklyPlanStatusBadge } from "@/components/weekly-plan-completion-panel";
import { supabase } from "@/integrations/supabase/client";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { fetchTeacherContext, type TeacherContext } from "@/lib/teacher-dashboard";
import {
  deleteWeeklyPlan,
  duplicateWeeklyPlan,
  fetchTeacherWeeklyPlans,
  formatWeeklyPlanSectionCodes,
  getAssignableGrades,
  getIslamicGroupsForSections,
  getSectionsForGrade,
  isWeeklyPlanUniqueScopeError,
  normalizeWeeklyPlanSections,
  weeklyPlanSectionsFromRow,
  type WeeklyPlanRow,
} from "@/lib/weekly-planning";
import type { IslamicGroup, StudentSection } from "@/lib/student-academics";

export const Route = createFileRoute("/teacher/weekly-planning/")({
  validateSearch: (s: Record<string, unknown>) => ({
    week: typeof s.week === "string" ? s.week : "",
    grade: typeof s.grade === "string" ? s.grade : "",
    section: typeof s.section === "string" ? s.section : "",
    status: typeof s.status === "string" ? s.status : "",
  }),
  component: TeacherWeeklyPlanningIndexPage,
});

function DuplicateDialog({
  plan,
  teacherContext,
  open,
  onOpenChange,
  onDone,
}: {
  plan: WeeklyPlanRow | null;
  teacherContext: TeacherContext | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { lang, tr } = useI18n();
  const [week, setWeek] = useState(1);
  const [planDate, setPlanDate] = useState("");
  const [grade, setGrade] = useState("");
  const [sections, setSections] = useState<StudentSection[]>([]);
  const [islamicGroup, setIslamicGroup] = useState<IslamicGroup | "">("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!plan) return;
    setWeek(Math.min(30, plan.week_number + 1));
    setPlanDate(plan.plan_date ?? "");
    setGrade(plan.grade);
    setSections(weeklyPlanSectionsFromRow(plan));
    setIslamicGroup((plan.islamic_group as IslamicGroup) ?? "");
  }, [plan]);

  const grades = teacherContext ? getAssignableGrades(teacherContext) : [];
  const availableSections = teacherContext && grade ? getSectionsForGrade(teacherContext, grade) : [];
  const groups =
    teacherContext && grade
      ? getIslamicGroupsForSections(teacherContext, grade, sections)
      : [];

  const duplicate = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const created = await duplicateWeeklyPlan(plan.id, data.user.id, {
        week_number: week,
        plan_date: planDate || null,
        grade,
        sections: normalizeWeeklyPlanSections(sections),
        islamic_group: islamicGroup || null,
      });
      toast.success(tr("wp_duplicated"));
      onOpenChange(false);
      onDone();
      window.location.assign(`/teacher/weekly-planning/${created.id}/edit`);
    } catch (e) {
      if (isWeeklyPlanUniqueScopeError(e)) {
        toast.error(tr("wp_duplicate_scope_error"));
      } else {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{tr("wp_duplicate_title")}</AlertDialogTitle>
          <AlertDialogDescription>{tr("wp_duplicate_desc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_week")}</span>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>{tr("wp_week_n").replace("{n}", String(w))}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_date")}</span>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_grade")}</span>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={grade}
              onChange={(e) => {
                const g = e.target.value;
                setGrade(g);
                const secs = teacherContext ? getSectionsForGrade(teacherContext, g) : [];
                const nextSections = secs[0] ? [secs[0]] : [];
                setSections(nextSections);
                const grps = teacherContext
                  ? getIslamicGroupsForSections(teacherContext, g, nextSections)
                  : [];
                setIslamicGroup(grps[0] ?? "");
              }}
            >
              {grades.map((g) => (
                <option key={g} value={g}>{gradeDisplayName(g, lang)}</option>
              ))}
            </select>
          </label>
          <div className="block text-sm">
            <WeeklyPlanSectionMultiSelect
              sections={sections}
              availableSections={availableSections}
              onChange={(next) => {
                setSections(next);
                const grps = teacherContext
                  ? getIslamicGroupsForSections(teacherContext, grade, next)
                  : [];
                setIslamicGroup((prev) =>
                  prev && grps.includes(prev as IslamicGroup) ? prev : grps[0] ?? "",
                );
              }}
            />
          </div>
          <label className="block text-sm">
            <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_islamic_group")}</span>
            <select
              className="mt-1 w-full rounded-lg border border-border px-3 py-2"
              value={islamicGroup}
              onChange={(e) => setIslamicGroup(e.target.value as IslamicGroup)}
            >
              {groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{tr("wp_cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void duplicate(); }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : tr("wp_duplicate_confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TeacherWeeklyPlanningIndexPage() {
  const navigate = useNavigate();
  const { lang, tr } = useI18n();
  const { week, grade, section, status } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<WeeklyPlanRow[]>([]);
  const [teacherContext, setTeacherContext] = useState<TeacherContext | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [duplicatePlan, setDuplicatePlan] = useState<WeeklyPlanRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const ctx = await fetchTeacherContext(data.user.id);
      const rows = await fetchTeacherWeeklyPlans(data.user.id);
      setTeacherContext(ctx);
      setPlans(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      if (week && String(p.week_number) !== week) return false;
      if (grade && p.grade !== grade) return false;
      if (section) {
        const planSections = weeklyPlanSectionsFromRow(p);
        if (!planSections.includes(section as StudentSection)) return false;
      }
      if (status && p.status !== status) return false;
      return true;
    });
  }, [plans, week, grade, section, status]);

  const grades = [...new Set(plans.map((p) => p.grade))];
  const sections = useMemo(() => {
    const codes = new Set<string>();
    for (const plan of plans) {
      for (const s of weeklyPlanSectionsFromRow(plan)) codes.add(s);
      if (plan.section) codes.add(plan.section);
    }
    return [...codes].sort();
  }, [plans]);

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteWeeklyPlan(deleteId);
      toast.success(tr("teacher_deleted"));
      setDeleteId(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_weekly_planning")}</h2>
        <Link
          to="/teacher/weekly-planning/new"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          {tr("teacher_nav_add_weekly_plan")}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
          value={week}
          onChange={(e) =>
            navigate({ to: "/teacher/weekly-planning", search: { week: e.target.value, grade, section, status } })
          }
        >
          <option value="">{tr("wp_filter_all_weeks")}</option>
          {Array.from({ length: 30 }, (_, i) => i + 1).map((w) => (
            <option key={w} value={String(w)}>{tr("wp_week_n").replace("{n}", String(w))}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
          value={grade}
          onChange={(e) =>
            navigate({ to: "/teacher/weekly-planning", search: { week, grade: e.target.value, section, status } })
          }
        >
          <option value="">{tr("wp_filter_all_grades")}</option>
          {grades.map((g) => (
            <option key={g} value={g}>{gradeDisplayName(g, lang)}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
          value={section}
          onChange={(e) =>
            navigate({ to: "/teacher/weekly-planning", search: { week, grade, section: e.target.value, status } })
          }
        >
          <option value="">{tr("wp_filter_all_sections")}</option>
          {sections.map((s) => (
            <option key={s} value={s!}>{s}</option>
          ))}
        </select>
        <select
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
          value={status}
          onChange={(e) =>
            navigate({ to: "/teacher/weekly-planning", search: { week, grade, section, status: e.target.value } })
          }
        >
          <option value="">{tr("wp_filter_all_status")}</option>
          <option value="not_started">{tr("wp_status_not_started")}</option>
          <option value="in_progress">{tr("wp_status_in_progress")}</option>
          <option value="complete">{tr("wp_status_complete")}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("wp_no_plans")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="p-3 font-medium">{tr("wp_field_week")}</th>
                <th className="p-3 font-medium">{tr("wp_col_status")}</th>
                <th className="p-3 font-medium">{tr("wp_col_completion")}</th>
                <th className="p-3 font-medium">{tr("wp_field_grade")}</th>
                <th className="p-3 font-medium">{tr("wp_field_section")}</th>
                <th className="p-3 font-medium">{tr("wp_field_islamic_group")}</th>
                <th className="p-3 font-medium">{tr("wp_field_lesson_title")}</th>
                <th className="p-3 font-medium">{tr("wp_field_date")}</th>
                <th className="p-3 font-medium">{tr("wp_col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((plan) => (
                <tr key={plan.id} className="border-b border-border/60 hover:bg-muted/30">
                  <td className="p-3">{plan.week_number}</td>
                  <td className="p-3"><WeeklyPlanStatusBadge status={plan.status} /></td>
                  <td className="p-3">{Math.round(plan.completion_percentage * 100)}%</td>
                  <td className="p-3">{gradeDisplayName(plan.grade, lang)}</td>
                  <td className="p-3">{formatWeeklyPlanSectionCodes(weeklyPlanSectionsFromRow(plan), lang)}</td>
                  <td className="p-3">{plan.islamic_group ?? "—"}</td>
                  <td className="p-3 max-w-[180px] truncate">{plan.lesson_title ?? "—"}</td>
                  <td className="p-3">{plan.plan_date ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Link
                        to="/teacher/weekly-planning/$planId"
                        params={{ planId: plan.id }}
                        className="rounded-lg p-1.5 hover:bg-muted"
                        title={tr("wp_action_view")}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        to="/teacher/weekly-planning/$planId/edit"
                        params={{ planId: plan.id }}
                        className="rounded-lg p-1.5 hover:bg-muted"
                        title={tr("wp_action_edit")}
                      >
                        <Pencil className="h-4 w-4 text-primary" />
                      </Link>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 hover:bg-muted"
                        title={tr("wp_action_duplicate")}
                        onClick={() => setDuplicatePlan(plan)}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <Link
                        to="/teacher/weekly-planning/$planId/print"
                        params={{ planId: plan.id }}
                        className="rounded-lg p-1.5 hover:bg-muted"
                        title={tr("wp_action_print")}
                      >
                        <Printer className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 hover:bg-muted text-destructive"
                        title={tr("wp_action_delete")}
                        onClick={() => setDeleteId(plan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("wp_delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{tr("wp_delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("wp_cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void confirmDelete(); }}>
              {tr("wp_delete_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DuplicateDialog
        plan={duplicatePlan}
        teacherContext={teacherContext}
        open={!!duplicatePlan}
        onOpenChange={(o) => !o && setDuplicatePlan(null)}
        onDone={() => void load()}
      />
    </div>
  );
}
