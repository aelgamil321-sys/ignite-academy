import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { WeeklyPlanCompletionPanel } from "@/components/weekly-plan-completion-panel";
import { WeeklyPlanDifferentiationCard } from "@/components/weekly-plan-differentiation-card";
import { WeeklyPlanPeriodBlock } from "@/components/weekly-plan-period-block";
import { WeeklyPlanSectionMultiSelect } from "@/components/weekly-plan-section-multi-select";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import {
  islamicGroupLabel,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";
import type { ScopedStudentRow, TeacherContext } from "@/lib/teacher-dashboard";
import {
  assignmentAllowsSections,
  buildDefaultWeeklyPlanPeriod,
  createWeeklyPlan,
  derivePhaseFromGradeSlug,
  dayWorkbookValueFromPlanDate,
  isNonWorkingPlanDate,
  fetchScopedStudentsForWeeklyPlan,
  getAssignableGrades,
  getIslamicGroupsForSections,
  getSectionsForGrade,
  isWeeklyPlanUniqueScopeError,
  masterListItemLabel,
  masterListItemValue,
  normalizeWeeklyPlanSections,
  scopedStudentWeeklyPlanLabel,
  updateWeeklyPlan,
  type CreateWeeklyPlanInput,
  type WeeklyPlanMasterList,
  type WeeklyPlanRow,
} from "@/lib/weekly-planning";
import {
  WEEKLY_PLAN_DEFAULT_SUBJECT,
  WEEKLY_PLAN_REFLECTION_PROMPT_TEMPLATE,
} from "@/lib/weekly-planning-master-data";
import { filterDifferentiationToStudents } from "@/lib/weekly-planning-master-repair";

const fieldClass = "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm";

type WeeklyPlanFormProps = {
  mode: "create" | "edit";
  planId?: string;
  initial: CreateWeeklyPlanInput;
  teacherContext: TeacherContext;
  masterLists: WeeklyPlanMasterList[];
  teacherDisplayName: string;
};

function listItems(lists: WeeklyPlanMasterList[], key: string) {
  const list = lists.find((l) => l.list_key === key);
  return list?.items ?? [];
}

export function WeeklyPlanForm({
  mode,
  planId,
  initial,
  teacherContext,
  masterLists,
  teacherDisplayName,
}: WeeklyPlanFormProps) {
  const navigate = useNavigate();
  const { lang, tr } = useI18n();
  const [form, setForm] = useState<CreateWeeklyPlanInput>(initial);
  const [scopedStudents, setScopedStudents] = useState<ScopedStudentRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const grades = getAssignableGrades(teacherContext);
  const availableSections = form.grade ? getSectionsForGrade(teacherContext, form.grade) : [];
  const selectedSections = normalizeWeeklyPlanSections(form.sections);
  const groups = form.grade
    ? getIslamicGroupsForSections(teacherContext, form.grade, selectedSections)
    : [];

  const days = listItems(masterLists, "days");
  const domains = listItems(masterLists, "domains");
  const successCriteria = listItems(masterLists, "success_criteria");
  const units = listItems(masterLists, "units");
  const p21Skills = listItems(masterLists, "p21_skills");
  const sirMethods = listItems(masterLists, "sir_methods");

  const completionPlan = useMemo(
    () =>
      ({
        ...form,
        id: planId ?? "draft",
        status: "not_started",
        completion_percentage: 0,
        created_at: "",
        updated_at: "",
      }) as WeeklyPlanRow,
    [form, planId],
  );

  useEffect(() => {
    let cancelled = false;
    const grade = form.grade;
    const sections = normalizeWeeklyPlanSections(form.sections);
    const islamic_group = form.islamic_group;

    if (!grade?.trim() || sections.length === 0 || !islamic_group) {
      setScopedStudents([]);
      setForm((prev) => ({ ...prev, student_count: null }));
      return;
    }

    void (async () => {
      if (!assignmentAllowsSections(teacherContext, grade, sections, islamic_group)) {
        if (!cancelled) {
          setScopedStudents([]);
          setForm((prev) => ({ ...prev, student_count: null }));
        }
        return;
      }

      const students = await fetchScopedStudentsForWeeklyPlan(
        teacherContext,
        grade,
        sections,
        islamic_group as IslamicGroup,
      );
      if (cancelled) return;

      setScopedStudents(students);
      const validIds = new Set(students.map((s) => s.userId));
      setForm((prev) => ({
        ...prev,
        student_count: students.length,
        differentiation_sod: filterDifferentiationToStudents(prev.differentiation_sod ?? {}, validIds),
        differentiation_eal: filterDifferentiationToStudents(prev.differentiation_eal ?? {}, validIds),
        differentiation_gt: filterDifferentiationToStudents(prev.differentiation_gt ?? {}, validIds),
        differentiation_emirati: filterDifferentiationToStudents(prev.differentiation_emirati ?? {}, validIds),
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [form.grade, form.sections, form.islamic_group, teacherContext]);

  const setField = <K extends keyof CreateWeeklyPlanInput>(key: K, value: CreateWeeklyPlanInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onGradeChange = (grade: string) => {
    const newSections = getSectionsForGrade(teacherContext, grade);
    setForm((prev) => {
      const kept = normalizeWeeklyPlanSections(prev.sections).filter((s) =>
        newSections.includes(s),
      );
      const sections = kept.length > 0 ? kept : newSections[0] ? [newSections[0]] : [];
      const newGroups = getIslamicGroupsForSections(teacherContext, grade, sections);
      const islamic_group =
        prev.islamic_group && newGroups.includes(prev.islamic_group as IslamicGroup)
          ? prev.islamic_group
          : newGroups[0] ?? null;
      return {
        ...prev,
        grade,
        sections,
        section: sections[0] ?? null,
        islamic_group,
        phase: derivePhaseFromGradeSlug(grade),
        student_count: null,
      };
    });
  };

  const onSectionsChange = (sections: StudentSection[]) => {
    setForm((prev) => {
      const normalized = normalizeWeeklyPlanSections(sections);
      const newGroups = getIslamicGroupsForSections(teacherContext, prev.grade, normalized);
      const islamic_group =
        prev.islamic_group && newGroups.includes(prev.islamic_group as IslamicGroup)
          ? prev.islamic_group
          : newGroups[0] ?? null;
      return {
        ...prev,
        sections: normalized,
        section: normalized[0] ?? null,
        islamic_group,
        student_count: null,
      };
    });
  };

  const onIslamicGroupChange = (islamic_group: IslamicGroup | null) => {
    setForm((prev) => ({
      ...prev,
      islamic_group,
      student_count: null,
    }));
  };

  const onPlanDateChange = (planDate: string | null) => {
    if (!planDate) {
      setForm((prev) => ({ ...prev, plan_date: null, day: null }));
      return;
    }
    if (isNonWorkingPlanDate(planDate)) {
      setForm((prev) => ({ ...prev, plan_date: planDate, day: null }));
      return;
    }
    const dayValue = dayWorkbookValueFromPlanDate(planDate, days);
    setForm((prev) => ({
      ...prev,
      plan_date: planDate,
      day: dayValue ?? null,
    }));
  };

  const planDateIsWeekend = form.plan_date ? isNonWorkingPlanDate(form.plan_date) : false;

  const phaseDisplay =
    form.grade ? derivePhaseFromGradeSlug(form.grade) ?? form.phase ?? "" : form.phase ?? "";

  const toggleP21 = (value: string) => {
    const current = form.p21_skills ?? [];
    if (current.includes(value)) {
      setField("p21_skills", current.filter((v) => v !== value));
    } else if (current.length < 4) {
      setField("p21_skills", [...current, value]);
    }
  };

  const validateScope = (): boolean => {
    if (!form.grade?.trim()) {
      toast.error(tr("wp_grade_required"));
      return false;
    }
    const sections = normalizeWeeklyPlanSections(form.sections);
    if (sections.length === 0) {
      toast.error(tr("wp_sections_required"));
      return false;
    }
    if (!assignmentAllowsSections(teacherContext, form.grade, sections, form.islamic_group)) {
      toast.error(tr("wp_scope_forbidden"));
      return false;
    }
    return true;
  };

  const save = async (redirect: "list" | "stay" | "view") => {
    if (!validateScope()) return;
    setSaving(true);
    try {
      const payload: CreateWeeklyPlanInput = {
        ...form,
        subject: WEEKLY_PLAN_DEFAULT_SUBJECT,
        plan_language: lang === "ar" ? "ar" : "en",
      };
      if (mode === "create") {
        const created = await createWeeklyPlan(payload);
        toast.success(tr("wp_saved"));
        if (redirect === "list") {
          navigate({ to: "/teacher/weekly-planning" });
        } else if (redirect === "view") {
          navigate({ to: "/teacher/weekly-planning/$planId", params: { planId: created.id } });
        } else {
          navigate({
            to: "/teacher/weekly-planning/$planId/edit",
            params: { planId: created.id },
          });
        }
      } else if (planId) {
        await updateWeeklyPlan(planId, payload);
        toast.success(tr("wp_saved"));
        if (redirect === "list") {
          navigate({ to: "/teacher/weekly-planning" });
        } else if (redirect === "view") {
          navigate({ to: "/teacher/weekly-planning/$planId", params: { planId } });
        }
      }
    } catch (e) {
      if (isWeeklyPlanUniqueScopeError(e)) {
        toast.error(tr("wp_duplicate_scope_error"));
      } else {
        toast.error(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(260px,300px)] lg:gap-8 items-start">
      <div className="space-y-5 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl text-foreground">
            {mode === "create" ? tr("wp_new_plan") : tr("wp_edit_plan")}
          </h2>
          <Link
            to="/teacher/weekly-planning"
            className="text-sm font-medium text-primary hover:underline"
          >
            {tr("wp_back_to_list")}
          </Link>
        </div>

        <Accordion type="multiple" defaultValue={["scope", "lesson", "diff", "first", "second", "reflection"]}>
          <AccordionItem value="scope" className="rounded-2xl border border-border bg-card px-4 mb-3">
            <AccordionTrigger className="font-display text-base">{tr("wp_section_scope")}</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-5 pt-1">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_teacher")}</span>
                  <input className={fieldClass} readOnly value={teacherDisplayName} />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_week")}</span>
                  <select
                    className={fieldClass}
                    value={form.week_number}
                    onChange={(e) => setField("week_number", Number(e.target.value))}
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>{tr("wp_week_n").replace("{n}", String(w))}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_grade")}</span>
                  <select
                    className={fieldClass}
                    value={form.grade}
                    onChange={(e) => onGradeChange(e.target.value)}
                  >
                    <option value="">{tr("wp_select_placeholder")}</option>
                    {grades.map((g) => (
                      <option key={g} value={g}>{gradeDisplayName(g, lang)}</option>
                    ))}
                  </select>
                </label>
                <div className="block text-sm sm:col-span-2">
                  <WeeklyPlanSectionMultiSelect
                    sections={selectedSections}
                    availableSections={availableSections}
                    onChange={onSectionsChange}
                  />
                </div>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_islamic_group")}</span>
                  <select
                    className={fieldClass}
                    value={form.islamic_group ?? ""}
                    onChange={(e) =>
                      onIslamicGroupChange((e.target.value as IslamicGroup) || null)
                    }
                    disabled={!form.grade || selectedSections.length === 0 || groups.length === 0}
                  >
                    {groups.map((g) => (
                      <option key={g} value={g}>{islamicGroupLabel(g, lang)}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_phase")}</span>
                  <input className={fieldClass} readOnly value={phaseDisplay} />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_student_count")}</span>
                  <input
                    className={fieldClass}
                    type="number"
                    min={0}
                    max={30}
                    value={form.student_count ?? ""}
                    onChange={(e) =>
                      setField("student_count", e.target.value ? Number(e.target.value) : null)
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_subject")}</span>
                  <input className={fieldClass} readOnly value={WEEKLY_PLAN_DEFAULT_SUBJECT} />
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_day")}</span>
                  <select
                    className={fieldClass}
                    value={form.day ?? ""}
                    onChange={(e) => setField("day", e.target.value || null)}
                  >
                    <option value="">{tr("wp_select_placeholder")}</option>
                    {days.map((d) => (
                      <option key={d.id} value={masterListItemValue(d)}>
                        {masterListItemLabel(d, lang)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_date")}</span>
                  <input
                    className={fieldClass}
                    type="date"
                    value={form.plan_date ?? ""}
                    onChange={(e) => onPlanDateChange(e.target.value || null)}
                  />
                  {planDateIsWeekend ? (
                    <p className="mt-1 text-xs text-amber-700">{tr("wp_non_working_day")}</p>
                  ) : null}
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_domain")}</span>
                  <select
                    className={fieldClass}
                    value={form.domain ?? ""}
                    onChange={(e) => setField("domain", e.target.value || null)}
                  >
                    <option value="">{tr("wp_select_placeholder")}</option>
                    {domains.map((d) => (
                      <option key={d.id} value={masterListItemValue(d)}>
                        {masterListItemLabel(d, lang)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_success_criterion")}</span>
                  <select
                    className={fieldClass}
                    value={form.success_criterion ?? ""}
                    onChange={(e) => setField("success_criterion", e.target.value || null)}
                  >
                    <option value="">{tr("wp_select_placeholder")}</option>
                    {successCriteria.map((d) => (
                      <option key={d.id} value={masterListItemValue(d)}>
                        {masterListItemLabel(d, lang)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_learning_outcomes")}</span>
                  <textarea
                    className={fieldClass}
                    rows={3}
                    value={form.learning_outcomes ?? ""}
                    onChange={(e) => setField("learning_outcomes", e.target.value || null)}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_unit")}</span>
                  <select
                    className={fieldClass}
                    value={form.unit ?? ""}
                    onChange={(e) => setField("unit", e.target.value || null)}
                  >
                    <option value="">{tr("wp_select_placeholder")}</option>
                    {units.map((u) => (
                      <option key={u.id} value={masterListItemValue(u)}>
                        {masterListItemLabel(u, lang)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="lesson" className="rounded-2xl border border-border bg-card px-4 mb-3">
            <AccordionTrigger className="font-display text-base">{tr("wp_section_lesson")}</AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_lesson_title")}</span>
                <input
                  className={fieldClass}
                  value={form.lesson_title ?? ""}
                  onChange={(e) => setField("lesson_title", e.target.value || null)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_uae_culture")}</span>
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={form.uae_culture ?? ""}
                  onChange={(e) => setField("uae_culture", e.target.value || null)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_cross_curricular")}</span>
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={form.cross_curricular_real_life ?? ""}
                  onChange={(e) => setField("cross_curricular_real_life", e.target.value || null)}
                />
              </label>
              <div className="text-sm">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_p21")}</span>
                <p className="text-xs text-muted-foreground mt-1">{tr("wp_p21_max")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p21Skills.map((skill) => {
                    const value = masterListItemValue(skill);
                    const selected = (form.p21_skills ?? []).includes(value);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleP21(value)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-muted/40"
                        }`}
                      >
                        {masterListItemLabel(skill, lang)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_vocabulary")}</span>
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={form.key_vocabulary ?? ""}
                  onChange={(e) => setField("key_vocabulary", e.target.value || null)}
                />
              </label>
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_resources")}</span>
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={form.resources ?? ""}
                  onChange={(e) => setField("resources", e.target.value || null)}
                />
              </label>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="diff" className="rounded-2xl border border-border bg-card px-4 mb-3">
            <AccordionTrigger className="font-display text-base">{tr("wp_section_differentiation")}</AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <WeeklyPlanDifferentiationCard
                title={tr("wp_diff_sod")}
                students={scopedStudents}
                category={form.differentiation_sod ?? { student_ids: [], student_names_snapshot: [], notes: "" }}
                onChange={(c) => setField("differentiation_sod", c)}
                studentLabel={scopedStudentWeeklyPlanLabel}
              />
              <WeeklyPlanDifferentiationCard
                title={tr("wp_diff_eal")}
                students={scopedStudents}
                category={form.differentiation_eal ?? { student_ids: [], student_names_snapshot: [], notes: "" }}
                onChange={(c) => setField("differentiation_eal", c)}
                studentLabel={scopedStudentWeeklyPlanLabel}
              />
              <WeeklyPlanDifferentiationCard
                title={tr("wp_diff_gt")}
                students={scopedStudents}
                category={form.differentiation_gt ?? { student_ids: [], student_names_snapshot: [], notes: "" }}
                onChange={(c) => setField("differentiation_gt", c)}
                studentLabel={scopedStudentWeeklyPlanLabel}
              />
              <WeeklyPlanDifferentiationCard
                title={tr("wp_diff_emirati")}
                students={scopedStudents}
                category={form.differentiation_emirati ?? { student_ids: [], student_names_snapshot: [], notes: "" }}
                onChange={(c) => setField("differentiation_emirati", c)}
                studentLabel={scopedStudentWeeklyPlanLabel}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="first" className="rounded-2xl border border-border bg-card px-4 mb-3">
            <AccordionTrigger className="font-display text-base">{tr("wp_section_first_period")}</AccordionTrigger>
            <AccordionContent className="pb-4">
              <WeeklyPlanPeriodBlock
                title={tr("wp_section_first_period")}
                period={form.first_period ?? buildDefaultWeeklyPlanPeriod()}
                sirMethods={sirMethods}
                onChange={(p) => setField("first_period", p)}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="second" className="rounded-2xl border border-border bg-card px-4 mb-3">
            <AccordionTrigger className="font-display text-base">{tr("wp_section_second_period")}</AccordionTrigger>
            <AccordionContent className="pb-4">
              <WeeklyPlanPeriodBlock
                title={tr("wp_section_second_period")}
                period={form.second_period ?? buildDefaultWeeklyPlanPeriod()}
                sirMethods={sirMethods}
                onChange={(p) => setField("second_period", p)}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="reflection" className="rounded-2xl border border-border bg-card px-4 mb-3">
            <AccordionTrigger className="font-display text-base">{tr("wp_section_reflection")}</AccordionTrigger>
            <AccordionContent className="pb-4">
              <label className="block text-sm">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("wp_field_reflection")}</span>
                <textarea
                  className={fieldClass}
                  rows={5}
                  placeholder={WEEKLY_PLAN_REFLECTION_PROMPT_TEMPLATE}
                  value={form.teacher_reflection ?? ""}
                  onChange={(e) => setField("teacher_reflection", e.target.value || null)}
                />
              </label>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex flex-wrap gap-3 pt-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save("stay")}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {tr("wp_save_draft")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save("list")}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {tr("wp_save_return")}
          </button>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 space-y-4">
        <WeeklyPlanCompletionPanel plan={completionPlan} />
      </div>
    </div>
  );
}
