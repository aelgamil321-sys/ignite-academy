import { supabase } from "@/integrations/supabase/client";
import { grades } from "@/lib/curriculum";
import { gradeMatches, normalizeGradeSlug } from "@/lib/grade-utils";
import type { Lang } from "@/lib/i18n-config";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";
import {
  WEEKLY_PLAN_ACADEMIC_YEAR,
  WEEKLY_PLAN_DEFAULT_SUBJECT,
  WEEKLY_PLAN_DIFFERENTIATION_PROMPT_TEMPLATE,
  WEEKLY_PLAN_REFLECTION_PROMPT_TEMPLATE,
  WEEKLY_PLAN_GRADES,
  WEEKLY_PLAN_PHASES,
} from "@/lib/weekly-planning-master-data";
import {
  fetchScopedStudents,
  assignmentScopeOptionsForGrade,
  type ScopedStudentRow,
  type TeacherAssignmentScope,
  type TeacherContext,
} from "@/lib/teacher-dashboard";
import {
  dayWorkbookValueFromPlanDate,
  filterDifferentiationToStudents,
  isCorruptedMasterListText,
  masterListItemsByKey,
  repairWeeklyPlanMasterLists,
  resolveStoredMasterListValue,
} from "@/lib/weekly-planning-master-repair";

export type WeeklyPlanLanguage = "en" | "ar";

export type WeeklyPlanStatus = "not_started" | "in_progress" | "complete";

export type WeeklyPlanYouDoGroups = {
  developing?: string;
  securing?: string;
  mastering?: string;
  extension?: string;
};

export type WeeklyPlanPeriod = {
  do_now?: string;
  learning_objective_success_criteria?: string;
  i_do?: string;
  we_do?: string;
  mid_assessment?: string;
  you_do?: WeeklyPlanYouDoGroups;
  exit_ticket?: string;
  sir_method?: string;
  homework?: string;
  do_now_minutes?: number;
  learning_objective_minutes?: number;
  i_do_minutes?: number;
  we_do_minutes?: number;
  mid_assessment_minutes?: number;
  you_do_minutes?: number;
  exit_ticket_minutes?: number;
};

export type WeeklyPlanDifferentiationCategory = {
  student_ids: string[];
  student_names_snapshot: string[];
  notes: string;
};

export type WeeklyPlanDifferentiation = {
  sod?: WeeklyPlanDifferentiationCategory;
  eal?: WeeklyPlanDifferentiationCategory;
  gt?: WeeklyPlanDifferentiationCategory;
  emirati?: WeeklyPlanDifferentiationCategory;
};

export const WEEKLY_PLAN_SECTION_ORDER: StudentSection[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
];

export type WeeklyPlanRow = {
  id: string;
  teacher_id: string;
  plan_language: WeeklyPlanLanguage;
  week_number: number;
  academic_year: string;
  phase: string | null;
  grade: string;
  /** Legacy mirror of first section; canonical scope is `sections`. */
  section: string | null;
  sections: string[];
  sections_key?: string;
  islamic_group: string | null;
  student_count: number | null;
  day: string | null;
  plan_date: string | null;
  subject: string;
  domain: string | null;
  success_criterion: string | null;
  learning_outcomes: string | null;
  unit: string | null;
  lesson_title: string | null;
  uae_culture: string | null;
  cross_curricular_real_life: string | null;
  p21_skills: string[] | null;
  key_vocabulary: string | null;
  resources: string | null;
  differentiation_sod: WeeklyPlanDifferentiationCategory | null;
  differentiation_eal: WeeklyPlanDifferentiationCategory | null;
  differentiation_gt: WeeklyPlanDifferentiationCategory | null;
  differentiation_emirati: WeeklyPlanDifferentiationCategory | null;
  first_period: WeeklyPlanPeriod | null;
  second_period: WeeklyPlanPeriod | null;
  teacher_reflection: string | null;
  status: WeeklyPlanStatus;
  completion_percentage: number;
  created_at: string;
  updated_at: string;
};

export type WeeklyPlanMasterListItem = {
  id: string;
  list_id: string;
  label_ar: string;
  label_en: string;
  sort_order: number;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
};

export type WeeklyPlanMasterList = {
  id: string;
  list_key: string;
  label_ar: string;
  label_en: string;
  is_active: boolean;
  items: WeeklyPlanMasterListItem[];
};

export type WeeklyPlanScopeOption = {
  grade: string;
  section: StudentSection | null;
  islamic_group: IslamicGroup | null;
  label: string;
};

export type WeeklyPlanCompletionBreakdown = {
  corePlanning: number;
  differentiation: number;
  firstPeriod: number;
  firstPeriodMax: number;
  secondPeriod: number;
  secondPeriodMax: number;
  reflection: number;
  completed: number;
  total: number;
  percentage: number;
  status: WeeklyPlanStatus;
  missingFields: WeeklyPlanMissingFieldDiagnostic[];
};

export type WeeklyPlanMissingFieldDiagnostic = {
  key: string;
  labelKey: string;
  periodKey?: "wp_completion_first" | "wp_completion_second";
};

export const WEEKLY_PLAN_COMPLETION_TOTAL = 40;
export const WEEKLY_PLAN_CORE_PLANNING_MAX = 17;
export const WEEKLY_PLAN_DIFFERENTIATION_MAX = 4;
export const WEEKLY_PLAN_PERIOD_MAX = 9;
export const WEEKLY_PLAN_REFLECTION_MAX = 1;

export const DEFAULT_WEEKLY_PLAN_PERIOD: WeeklyPlanPeriod = {
  do_now_minutes: 5,
  learning_objective_minutes: 2,
  i_do_minutes: 5,
  we_do_minutes: 5,
  mid_assessment_minutes: 5,
  you_do_minutes: 20,
  exit_ticket_minutes: 5,
};

export const EMPTY_DIFFERENTIATION_CATEGORY: WeeklyPlanDifferentiationCategory = {
  student_ids: [],
  student_names_snapshot: [],
  notes: "",
};

function normalizeComparableText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

/** Non-empty text that is not an exact placeholder/template string. */
function hasTeacherEnteredText(
  value: string | null | undefined,
  ignoreExact: string[] = [],
): boolean {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return false;
  const normalized = normalizeComparableText(trimmed);
  for (const template of ignoreExact) {
    if (normalized === normalizeComparableText(template)) return false;
  }
  return true;
}

const YOU_DO_GROUP_LABEL_ONLY = [
  "المجموعة 1 / Group 1:",
  "المجموعة 2 / Group 2:",
  "المجموعة 3 / Group 3:",
  "المجموعة 4 – إثراء / Group 4 – Extension:",
];

function meaningfulYouDoGroup(value: string | undefined): boolean {
  return hasTeacherEnteredText(value, YOU_DO_GROUP_LABEL_ONLY);
}

function meaningfulYouDo(youDo: WeeklyPlanYouDoGroups | null | undefined): boolean {
  if (!youDo) return false;
  return (
    meaningfulYouDoGroup(youDo.developing) &&
    meaningfulYouDoGroup(youDo.securing) &&
    meaningfulYouDoGroup(youDo.mastering) &&
    meaningfulYouDoGroup(youDo.extension)
  );
}

function meaningfulDifferentiation(
  value: WeeklyPlanDifferentiationCategory | null | undefined,
): boolean {
  if (!value) return false;
  const hasStudents =
    (value.student_ids?.length ?? 0) > 0 || (value.student_names_snapshot?.length ?? 0) > 0;
  return (
    hasStudents ||
    hasTeacherEnteredText(value.notes, [WEEKLY_PLAN_DIFFERENTIATION_PROMPT_TEMPLATE])
  );
}

function effectivePlanPhase(
  plan: Pick<WeeklyPlanRow, "phase" | "grade">,
): string | null {
  if (hasTeacherEnteredText(plan.phase)) return plan.phase!.trim();
  if (plan.grade?.trim()) return derivePhaseFromGradeSlug(plan.grade);
  return null;
}

type CompletionPlanInput = Pick<
  WeeklyPlanRow,
  | "phase"
  | "grade"
  | "section"
  | "sections"
  | "islamic_group"
  | "student_count"
  | "day"
  | "plan_date"
  | "domain"
  | "success_criterion"
  | "learning_outcomes"
  | "unit"
  | "lesson_title"
  | "uae_culture"
  | "cross_curricular_real_life"
  | "p21_skills"
  | "key_vocabulary"
  | "resources"
  | "differentiation_sod"
  | "differentiation_eal"
  | "differentiation_gt"
  | "differentiation_emirati"
  | "first_period"
  | "second_period"
  | "teacher_reflection"
>;

type CompletionCheck = {
  key: string;
  labelKey: string;
  periodKey?: "wp_completion_first" | "wp_completion_second";
  category: "core" | "diff" | "first" | "second" | "reflection";
  isComplete: (plan: CompletionPlanInput) => boolean;
};

const WEEKLY_PLAN_COMPLETION_CHECKS: CompletionCheck[] = [
  {
    key: "phase",
    labelKey: "wp_field_phase",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(effectivePlanPhase(plan)),
  },
  {
    key: "grade",
    labelKey: "wp_field_grade",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.grade),
  },
  {
    key: "section",
    labelKey: "wp_field_sections",
    category: "core",
    isComplete: (plan) => weeklyPlanSectionsFromRow(plan).length > 0,
  },
  {
    key: "islamic_group",
    labelKey: "wp_field_islamic_group",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.islamic_group),
  },
  {
    key: "student_count",
    labelKey: "wp_field_student_count",
    category: "core",
    isComplete: (plan) => plan.student_count !== null && plan.student_count !== undefined,
  },
  {
    key: "day",
    labelKey: "wp_field_day",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.day),
  },
  {
    key: "plan_date",
    labelKey: "wp_field_date",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.plan_date),
  },
  {
    key: "domain",
    labelKey: "wp_field_domain",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.domain),
  },
  {
    key: "success_criterion",
    labelKey: "wp_field_success_criterion",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.success_criterion),
  },
  {
    key: "learning_outcomes",
    labelKey: "wp_field_learning_outcomes",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.learning_outcomes),
  },
  {
    key: "unit",
    labelKey: "wp_field_unit",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.unit),
  },
  {
    key: "lesson_title",
    labelKey: "wp_field_lesson_title",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.lesson_title),
  },
  {
    key: "uae_culture",
    labelKey: "wp_field_uae_culture",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.uae_culture),
  },
  {
    key: "cross_curricular_real_life",
    labelKey: "wp_field_cross_curricular",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.cross_curricular_real_life),
  },
  {
    key: "p21_skills",
    labelKey: "wp_field_p21",
    category: "core",
    isComplete: (plan) => (plan.p21_skills?.length ?? 0) > 0,
  },
  {
    key: "key_vocabulary",
    labelKey: "wp_field_vocabulary",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.key_vocabulary),
  },
  {
    key: "resources",
    labelKey: "wp_field_resources",
    category: "core",
    isComplete: (plan) => hasTeacherEnteredText(plan.resources),
  },
  {
    key: "differentiation_sod",
    labelKey: "wp_diff_sod",
    category: "diff",
    isComplete: (plan) => meaningfulDifferentiation(plan.differentiation_sod),
  },
  {
    key: "differentiation_eal",
    labelKey: "wp_diff_eal",
    category: "diff",
    isComplete: (plan) => meaningfulDifferentiation(plan.differentiation_eal),
  },
  {
    key: "differentiation_gt",
    labelKey: "wp_diff_gt",
    category: "diff",
    isComplete: (plan) => meaningfulDifferentiation(plan.differentiation_gt),
  },
  {
    key: "differentiation_emirati",
    labelKey: "wp_diff_emirati",
    category: "diff",
    isComplete: (plan) => meaningfulDifferentiation(plan.differentiation_emirati),
  },
  {
    key: "first_period.do_now",
    labelKey: "wp_period_do_now",
    periodKey: "wp_completion_first",
    category: "first",
    isComplete: (plan) => hasTeacherEnteredText(plan.first_period?.do_now),
  },
  {
    key: "first_period.learning_objective_success_criteria",
    labelKey: "wp_period_objective",
    periodKey: "wp_completion_first",
    category: "first",
    isComplete: (plan) => hasTeacherEnteredText(plan.first_period?.learning_objective_success_criteria),
  },
  {
    key: "first_period.i_do",
    labelKey: "wp_period_i_do",
    periodKey: "wp_completion_first",
    category: "first",
    isComplete: (plan) => hasTeacherEnteredText(plan.first_period?.i_do),
  },
  {
    key: "first_period.we_do",
    labelKey: "wp_period_we_do",
    periodKey: "wp_completion_first",
    category: "first",
    isComplete: (plan) => hasTeacherEnteredText(plan.first_period?.we_do),
  },
  {
    key: "first_period.mid_assessment",
    labelKey: "wp_period_mid",
    periodKey: "wp_completion_first",
    category: "first",
    isComplete: (plan) => hasTeacherEnteredText(plan.first_period?.mid_assessment),
  },
  {
    key: "first_period.you_do",
    labelKey: "wp_period_you_do",
    periodKey: "wp_completion_first",
    category: "first",
    isComplete: (plan) => meaningfulYouDo(plan.first_period?.you_do),
  },
  {
    key: "first_period.exit_ticket",
    labelKey: "wp_period_exit",
    periodKey: "wp_completion_first",
    category: "first",
    isComplete: (plan) => hasTeacherEnteredText(plan.first_period?.exit_ticket),
  },
  {
    key: "first_period.sir_method",
    labelKey: "wp_period_sir",
    periodKey: "wp_completion_first",
    category: "first",
    isComplete: (plan) => hasTeacherEnteredText(plan.first_period?.sir_method),
  },
  {
    key: "first_period.homework",
    labelKey: "wp_period_homework",
    periodKey: "wp_completion_first",
    category: "first",
    isComplete: (plan) => hasTeacherEnteredText(plan.first_period?.homework),
  },
  {
    key: "second_period.do_now",
    labelKey: "wp_period_do_now",
    periodKey: "wp_completion_second",
    category: "second",
    isComplete: (plan) => hasTeacherEnteredText(plan.second_period?.do_now),
  },
  {
    key: "second_period.learning_objective_success_criteria",
    labelKey: "wp_period_objective",
    periodKey: "wp_completion_second",
    category: "second",
    isComplete: (plan) => hasTeacherEnteredText(plan.second_period?.learning_objective_success_criteria),
  },
  {
    key: "second_period.i_do",
    labelKey: "wp_period_i_do",
    periodKey: "wp_completion_second",
    category: "second",
    isComplete: (plan) => hasTeacherEnteredText(plan.second_period?.i_do),
  },
  {
    key: "second_period.we_do",
    labelKey: "wp_period_we_do",
    periodKey: "wp_completion_second",
    category: "second",
    isComplete: (plan) => hasTeacherEnteredText(plan.second_period?.we_do),
  },
  {
    key: "second_period.mid_assessment",
    labelKey: "wp_period_mid",
    periodKey: "wp_completion_second",
    category: "second",
    isComplete: (plan) => hasTeacherEnteredText(plan.second_period?.mid_assessment),
  },
  {
    key: "second_period.you_do",
    labelKey: "wp_period_you_do",
    periodKey: "wp_completion_second",
    category: "second",
    isComplete: (plan) => meaningfulYouDo(plan.second_period?.you_do),
  },
  {
    key: "second_period.exit_ticket",
    labelKey: "wp_period_exit",
    periodKey: "wp_completion_second",
    category: "second",
    isComplete: (plan) => hasTeacherEnteredText(plan.second_period?.exit_ticket),
  },
  {
    key: "second_period.sir_method",
    labelKey: "wp_period_sir",
    periodKey: "wp_completion_second",
    category: "second",
    isComplete: (plan) => hasTeacherEnteredText(plan.second_period?.sir_method),
  },
  {
    key: "second_period.homework",
    labelKey: "wp_period_homework",
    periodKey: "wp_completion_second",
    category: "second",
    isComplete: (plan) => hasTeacherEnteredText(plan.second_period?.homework),
  },
  {
    key: "teacher_reflection",
    labelKey: "wp_field_reflection",
    category: "reflection",
    isComplete: (plan) =>
      hasTeacherEnteredText(plan.teacher_reflection, [WEEKLY_PLAN_REFLECTION_PROMPT_TEMPLATE]),
  },
];

export function normalizeWeeklyPlanSections(
  sections: string[] | null | undefined,
): StudentSection[] {
  const valid = new Set<string>(STUDENT_SECTIONS);
  const deduped = new Set<StudentSection>();
  for (const raw of sections ?? []) {
    if (valid.has(raw)) deduped.add(raw as StudentSection);
  }
  return WEEKLY_PLAN_SECTION_ORDER.filter((s) => deduped.has(s));
}

export function weeklyPlanSectionsKey(sections: StudentSection[]): string {
  return normalizeWeeklyPlanSections(sections).join(",");
}

export function weeklyPlanSectionsFromRow(
  plan: Pick<WeeklyPlanRow, "sections" | "section">,
): StudentSection[] {
  if (plan.sections?.length) {
    return normalizeWeeklyPlanSections(plan.sections);
  }
  if (plan.section) {
    return normalizeWeeklyPlanSections([plan.section]);
  }
  return [];
}

export function formatWeeklyPlanSectionCodes(
  sections: StudentSection[],
  lang?: Lang,
): string {
  const codes = normalizeWeeklyPlanSections(sections);
  const separator = lang === "ar" ? "، " : ", ";
  return codes.join(separator);
}

export function scopedStudentWeeklyPlanLabel(
  student: Pick<ScopedStudentRow, "displayName" | "section">,
): string {
  return student.section ? `${student.displayName} — ${student.section}` : student.displayName;
}

export function prepareWeeklyPlanPersistenceFields(
  input: Pick<CreateWeeklyPlanInput, "grade" | "section" | "sections" | "islamic_group">,
): Pick<WeeklyPlanRow, "sections" | "sections_key" | "section"> {
  const sections = normalizeWeeklyPlanSections(
    input.sections?.length ? input.sections : input.section ? [input.section] : [],
  );
  return {
    sections,
    sections_key: weeklyPlanSectionsKey(sections),
    section: sections[0] ?? null,
  };
}

export function derivePhaseFromGradeSlug(gradeSlug: string): string | null {
  const normalized = normalizeGradeSlug(gradeSlug);
  const gradeSeed = WEEKLY_PLAN_GRADES.find((g) => g.metadata?.grade_slug === normalized);
  const phaseSlug = gradeSeed?.metadata?.phase_slug as string | undefined;
  if (!phaseSlug) return null;
  const phaseSeed = WEEKLY_PLAN_PHASES.find((p) => p.metadata?.phase_slug === phaseSlug);
  return phaseSeed?.workbookValue ?? null;
}

export function teacherAssignmentCoversWeeklyPlanScope(
  assignments: TeacherAssignmentScope[],
  isLeadTeacher: boolean,
  grade: string,
  section: string | null,
  islamic_group: string | null,
): boolean {
  if (isLeadTeacher) return true;
  const gradeNorm = normalizeGradeSlug(grade) || grade;
  return assignments.some((assignment) => {
    const assignmentGradeNorm = normalizeGradeSlug(assignment.grade) || assignment.grade;
    if (assignmentGradeNorm !== gradeNorm && assignment.grade !== gradeNorm) return false;
    if (assignment.section && section && assignment.section !== section) return false;
    if (
      assignment.islamic_group &&
      islamic_group &&
      assignment.islamic_group !== islamic_group
    ) {
      return false;
    }
    return true;
  });
}

export function studentMatchesWeeklyPlanClassScope(
  student: Pick<ScopedStudentRow, "grade" | "section" | "islamic_group">,
  grade: string,
  section: StudentSection | null,
  islamic_group: IslamicGroup | null,
): boolean {
  if (!gradeMatches(student.grade, grade)) return false;
  if (section && student.section !== section) return false;
  if (islamic_group && student.islamic_group !== islamic_group) return false;
  return true;
}

export function calculateWeeklyPlanCompletion(
  plan: CompletionPlanInput,
): WeeklyPlanCompletionBreakdown {
  const missingFields: WeeklyPlanMissingFieldDiagnostic[] = [];
  let corePlanning = 0;
  let differentiation = 0;
  let firstPeriod = 0;
  let secondPeriod = 0;
  let reflection = 0;

  for (const check of WEEKLY_PLAN_COMPLETION_CHECKS) {
    const complete = check.isComplete(plan);
    if (complete) {
      switch (check.category) {
        case "core":
          corePlanning += 1;
          break;
        case "diff":
          differentiation += 1;
          break;
        case "first":
          firstPeriod += 1;
          break;
        case "second":
          secondPeriod += 1;
          break;
        case "reflection":
          reflection += 1;
          break;
      }
    } else {
      missingFields.push({
        key: check.key,
        labelKey: check.labelKey,
        periodKey: check.periodKey,
      });
    }
  }

  const completed =
    corePlanning + differentiation + firstPeriod + secondPeriod + reflection;
  const percentage = completed / WEEKLY_PLAN_COMPLETION_TOTAL;
  let status: WeeklyPlanStatus = "not_started";
  if (completed === 0) status = "not_started";
  else if (completed >= WEEKLY_PLAN_COMPLETION_TOTAL) status = "complete";
  else status = "in_progress";

  return {
    corePlanning,
    differentiation,
    firstPeriod,
    firstPeriodMax: WEEKLY_PLAN_PERIOD_MAX,
    secondPeriod,
    secondPeriodMax: WEEKLY_PLAN_PERIOD_MAX,
    reflection,
    completed,
    total: WEEKLY_PLAN_COMPLETION_TOTAL,
    percentage,
    status,
    missingFields,
  };
}

export function withWeeklyPlanCompletion<T extends WeeklyPlanRow>(plan: T): T {
  const completion = calculateWeeklyPlanCompletion(plan);
  return {
    ...plan,
    status: completion.status,
    completion_percentage: completion.percentage,
  };
}

export function buildDefaultWeeklyPlanPeriod(): WeeklyPlanPeriod {
  return {
    ...DEFAULT_WEEKLY_PLAN_PERIOD,
    you_do: {
      developing: "",
      securing: "",
      mastering: "",
      extension: "",
    },
  };
}

export function buildDefaultWeeklyPlanDifferentiation(): WeeklyPlanDifferentiation {
  return {
    sod: { ...EMPTY_DIFFERENTIATION_CATEGORY },
    eal: { ...EMPTY_DIFFERENTIATION_CATEGORY },
    gt: { ...EMPTY_DIFFERENTIATION_CATEGORY },
    emirati: { ...EMPTY_DIFFERENTIATION_CATEGORY },
  };
}

export async function fetchWeeklyPlanMasterLists(): Promise<WeeklyPlanMasterList[]> {
  const { data: lists, error: listsError } = await supabase
    .from("weekly_plan_master_lists")
    .select("*")
    .eq("is_active", true)
    .order("list_key");

  if (listsError) throw listsError;

  const { data: items, error: itemsError } = await supabase
    .from("weekly_plan_master_list_items")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (itemsError) throw itemsError;

  const itemsByList = new Map<string, WeeklyPlanMasterListItem[]>();
  for (const item of items ?? []) {
    const bucket = itemsByList.get(item.list_id) ?? [];
    bucket.push(item as WeeklyPlanMasterListItem);
    itemsByList.set(item.list_id, bucket);
  }

  return repairWeeklyPlanMasterLists(
    (lists ?? []).map((list) => ({
      ...list,
      items: itemsByList.get(list.id) ?? [],
    })) as WeeklyPlanMasterList[],
  );
}

export async function fetchTeacherWeeklyPlans(teacherId: string): Promise<WeeklyPlanRow[]> {
  const { data, error } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("week_number");

  if (error) throw error;
  return (data ?? []) as WeeklyPlanRow[];
}

export async function fetchWeeklyPlanById(planId: string): Promise<WeeklyPlanRow | null> {
  const { data, error } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error) throw error;
  return (data as WeeklyPlanRow | null) ?? null;
}

export type CreateWeeklyPlanInput = Omit<
  WeeklyPlanRow,
  "id" | "created_at" | "updated_at" | "status" | "completion_percentage"
>;

export async function createWeeklyPlan(
  input: CreateWeeklyPlanInput,
): Promise<WeeklyPlanRow> {
  const scopeFields = prepareWeeklyPlanPersistenceFields(input);
  const normalizedInput = { ...input, ...scopeFields };
  const completion = calculateWeeklyPlanCompletion(normalizedInput);
  const payload = {
    ...normalizedInput,
    grade: normalizeGradeSlug(input.grade),
    phase: input.phase ?? derivePhaseFromGradeSlug(input.grade),
    subject: input.subject || "التربية الإسلامية / Islamic Education",
    status: completion.status,
    completion_percentage: completion.percentage,
  };

  const { data, error } = await supabase.from("weekly_plans").insert(payload).select().single();
  if (error) throw error;
  return data as WeeklyPlanRow;
}

export async function updateWeeklyPlan(
  planId: string,
  patch: Partial<CreateWeeklyPlanInput>,
): Promise<WeeklyPlanRow> {
  const existing = await fetchWeeklyPlanById(planId);
  if (!existing) throw new Error("Weekly plan not found");

  const merged = { ...existing, ...patch } as WeeklyPlanRow;
  const scopeFields = prepareWeeklyPlanPersistenceFields(merged);
  const mergedWithScope = { ...merged, ...scopeFields };
  const completion = calculateWeeklyPlanCompletion(mergedWithScope);
  const payload = {
    ...patch,
    ...scopeFields,
    ...(patch.grade ? { grade: normalizeGradeSlug(patch.grade) } : {}),
    status: completion.status,
    completion_percentage: completion.percentage,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("weekly_plans")
    .update(payload)
    .eq("id", planId)
    .select()
    .single();

  if (error) throw error;
  return data as WeeklyPlanRow;
}

export async function deleteWeeklyPlan(planId: string): Promise<void> {
  const { error } = await supabase.from("weekly_plans").delete().eq("id", planId);
  if (error) throw error;
}

export function masterListItemLabel(item: WeeklyPlanMasterListItem, lang: Lang): string {
  const primary = lang === "ar" ? item.label_ar : item.label_en;
  if (!isCorruptedMasterListText(primary)) return primary;
  const fallback = lang === "ar" ? item.label_en : item.label_ar;
  if (!isCorruptedMasterListText(fallback)) return fallback;
  return primary;
}

export function masterListItemValue(item: WeeklyPlanMasterListItem): string {
  const workbook = item.metadata?.workbook_value;
  if (typeof workbook === "string" && workbook.trim() && !isCorruptedMasterListText(workbook)) {
    return workbook.trim();
  }
  if (item.label_ar && item.label_en && !isCorruptedMasterListText(item.label_ar)) {
    return `${item.label_ar} / ${item.label_en}`;
  }
  if (!isCorruptedMasterListText(item.label_en)) return item.label_en;
  if (!isCorruptedMasterListText(item.label_ar)) return item.label_ar;
  return item.label_ar || item.label_en;
}

export function normalizeWeeklyPlanInputFields(
  input: CreateWeeklyPlanInput,
  masterLists: WeeklyPlanMasterList[],
): CreateWeeklyPlanInput {
  const dayItems = masterListItemsByKey(masterLists, "days");
  const domainItems = masterListItemsByKey(masterLists, "domains");
  const successItems = masterListItemsByKey(masterLists, "success_criteria");
  const unitItems = masterListItemsByKey(masterLists, "units");
  const p21Items = masterListItemsByKey(masterLists, "p21_skills");

  const phase =
    input.grade && (isCorruptedMasterListText(input.phase) || !input.phase)
      ? derivePhaseFromGradeSlug(input.grade)
      : input.phase;

  const p21_skills = (input.p21_skills ?? []).map((value) => {
    const resolved = resolveStoredMasterListValue(value, p21Items);
    return resolved ?? value;
  });

  const firstSir = input.first_period?.sir_method
    ? resolveStoredMasterListValue(
        input.first_period.sir_method,
        masterListItemsByKey(masterLists, "sir_methods"),
      )
    : null;
  const secondSir = input.second_period?.sir_method
    ? resolveStoredMasterListValue(
        input.second_period.sir_method,
        masterListItemsByKey(masterLists, "sir_methods"),
      )
    : null;

  return {
    ...input,
    phase,
    day: resolveStoredMasterListValue(input.day, dayItems) ?? input.day,
    domain: resolveStoredMasterListValue(input.domain, domainItems) ?? input.domain,
    success_criterion:
      resolveStoredMasterListValue(input.success_criterion, successItems) ?? input.success_criterion,
    unit: resolveStoredMasterListValue(input.unit, unitItems) ?? input.unit,
    p21_skills,
    first_period: firstSir
      ? { ...input.first_period, sir_method: firstSir }
      : input.first_period,
    second_period: secondSir
      ? { ...input.second_period, sir_method: secondSir }
      : input.second_period,
  };
}

export {
  dayWorkbookValueFromPlanDate,
  isCorruptedMasterListText,
  isNonWorkingPlanDate,
} from "@/lib/weekly-planning-master-repair";

export function getAssignableGrades(context: TeacherContext): string[] {
  if (context.isLeadTeacher) {
    return grades.map((g) => g.slug);
  }
  return context.assignedGrades;
}

export function getSectionsForGrade(
  context: TeacherContext,
  grade: string,
): StudentSection[] {
  if (context.isLeadTeacher) {
    return [...STUDENT_SECTIONS];
  }

  const { sections } = assignmentScopeOptionsForGrade(context, grade);
  const explicit = sections.filter((section): section is StudentSection => section !== null);
  if (explicit.length > 0) {
    return explicit;
  }

  // Grade-wide assignment (section NULL in teacher_assignments) covers all sections in that grade.
  if (sections.includes(null)) {
    return [...STUDENT_SECTIONS];
  }

  return [];
}

export function getIslamicGroupsForScope(
  context: TeacherContext,
  grade: string,
  section: StudentSection | null,
): IslamicGroup[] {
  if (!section) {
    return getIslamicGroupsForSections(context, grade, []);
  }
  return getIslamicGroupsForSections(context, grade, [section]);
}

export function getIslamicGroupsForSections(
  context: TeacherContext,
  grade: string,
  sections: StudentSection[],
): IslamicGroup[] {
  const normalized = normalizeGradeSlug(grade);
  if (context.isLeadTeacher) {
    return [...ISLAMIC_GROUPS];
  }
  if (sections.length === 0) {
    const groups = context.assignments
      .filter((a) => normalizeGradeSlug(a.grade) === normalized && a.islamic_group)
      .map((a) => a.islamic_group as IslamicGroup);
    return [...new Set(groups)];
  }
  const perSection = sections.map((section) => {
    return context.assignments
      .filter((a) => {
        if (normalizeGradeSlug(a.grade) !== normalized) return false;
        if (a.section && a.section !== section) return false;
        return a.islamic_group;
      })
      .map((a) => a.islamic_group as IslamicGroup);
  });
  const intersection = perSection.reduce<IslamicGroup[]>(
    (acc, groups) => acc.filter((g) => groups.includes(g)),
    perSection[0] ?? [],
  );
  return [...new Set(intersection)];
}

export function assignmentAllowsSections(
  context: TeacherContext,
  grade: string,
  sections: StudentSection[],
  islamic_group: string | null,
): boolean {
  if (!sections.length) return false;
  return sections.every((section) =>
    assignmentAllowsScope(context, grade, section, islamic_group),
  );
}

export function assignmentAllowsScope(
  context: TeacherContext,
  grade: string,
  section: string | null,
  islamic_group: string | null,
): boolean {
  return teacherAssignmentCoversWeeklyPlanScope(
    context.assignments,
    context.isLeadTeacher,
    grade,
    section,
    islamic_group,
  );
}

export async function fetchScopedStudentsForWeeklyPlan(
  context: TeacherContext,
  grade: string,
  sections: StudentSection[],
  islamic_group: IslamicGroup | null,
): Promise<ScopedStudentRow[]> {
  const gradeNorm = normalizeGradeSlug(grade);
  const normalizedSections = normalizeWeeklyPlanSections(sections);
  if (!gradeNorm || normalizedSections.length === 0 || !islamic_group) return [];

  if (
    !context.isLeadTeacher &&
    !assignmentAllowsSections(context, gradeNorm, normalizedSections, islamic_group)
  ) {
    return [];
  }

  const sectionSet = new Set(normalizedSections);
  const students = await fetchScopedStudents();
  const seen = new Set<string>();
  const scoped: ScopedStudentRow[] = [];

  for (const student of students) {
    if (!gradeMatches(student.grade, gradeNorm)) continue;
    if (student.islamic_group !== islamic_group) continue;
    if (!student.section || !sectionSet.has(student.section)) continue;
    if (seen.has(student.userId)) continue;
    seen.add(student.userId);
    scoped.push(student);
  }

  return scoped.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }),
  );
}

export async function countStudentsInWeeklyPlanScope(
  context: TeacherContext,
  grade: string,
  sections: StudentSection[],
  islamic_group: string | null,
): Promise<number> {
  const students = await fetchScopedStudentsForWeeklyPlan(
    context,
    grade,
    sections,
    islamic_group as IslamicGroup | null,
  );
  return students.length;
}

export function buildEmptyWeeklyPlanInput(
  teacherId: string,
  planLanguage: WeeklyPlanLanguage,
): CreateWeeklyPlanInput {
  const diff = buildDefaultWeeklyPlanDifferentiation();
  return {
    teacher_id: teacherId,
    plan_language: planLanguage,
    week_number: 1,
    academic_year: WEEKLY_PLAN_ACADEMIC_YEAR,
    phase: null,
    grade: "",
    section: null,
    sections: [],
    islamic_group: null,
    student_count: null,
    day: null,
    plan_date: null,
    subject: WEEKLY_PLAN_DEFAULT_SUBJECT,
    domain: null,
    success_criterion: null,
    learning_outcomes: null,
    unit: null,
    lesson_title: null,
    uae_culture: null,
    cross_curricular_real_life: null,
    p21_skills: [],
    key_vocabulary: null,
    resources: null,
    differentiation_sod: diff.sod ?? EMPTY_DIFFERENTIATION_CATEGORY,
    differentiation_eal: diff.eal ?? EMPTY_DIFFERENTIATION_CATEGORY,
    differentiation_gt: diff.gt ?? EMPTY_DIFFERENTIATION_CATEGORY,
    differentiation_emirati: diff.emirati ?? EMPTY_DIFFERENTIATION_CATEGORY,
    first_period: buildDefaultWeeklyPlanPeriod(),
    second_period: buildDefaultWeeklyPlanPeriod(),
    teacher_reflection: null,
  };
}

export function buildDuplicateWeeklyPlanInput(
  source: WeeklyPlanRow,
  teacherId: string,
  overrides: {
    week_number: number;
    plan_date?: string | null;
    grade?: string;
    sections?: StudentSection[];
    section?: string | null;
    islamic_group?: string | null;
  },
): CreateWeeklyPlanInput {
  const grade = overrides.grade ?? source.grade;
  const sections = overrides.sections
    ? normalizeWeeklyPlanSections(overrides.sections)
    : overrides.section
      ? normalizeWeeklyPlanSections([overrides.section])
      : weeklyPlanSectionsFromRow(source);
  const scopeFields = prepareWeeklyPlanPersistenceFields({
    grade,
    sections,
    section: sections[0] ?? null,
    islamic_group: overrides.islamic_group ?? source.islamic_group,
  });
  const islamic_group = overrides.islamic_group ?? source.islamic_group;
  return {
    teacher_id: teacherId,
    plan_language: source.plan_language,
    week_number: overrides.week_number,
    academic_year: source.academic_year,
    phase: derivePhaseFromGradeSlug(grade) ?? source.phase,
    grade,
    section: scopeFields.section,
    sections: scopeFields.sections,
    islamic_group,
    student_count: source.student_count,
    day: source.day,
    plan_date: overrides.plan_date ?? source.plan_date,
    subject: source.subject,
    domain: source.domain,
    success_criterion: source.success_criterion,
    learning_outcomes: source.learning_outcomes,
    unit: source.unit,
    lesson_title: source.lesson_title,
    uae_culture: source.uae_culture,
    cross_curricular_real_life: source.cross_curricular_real_life,
    p21_skills: source.p21_skills ?? [],
    key_vocabulary: source.key_vocabulary,
    resources: source.resources,
    differentiation_sod: source.differentiation_sod,
    differentiation_eal: source.differentiation_eal,
    differentiation_gt: source.differentiation_gt,
    differentiation_emirati: source.differentiation_emirati,
    first_period: source.first_period,
    second_period: source.second_period,
    teacher_reflection: source.teacher_reflection,
  };
}

export async function duplicateWeeklyPlan(
  sourcePlanId: string,
  teacherId: string,
  overrides: {
    week_number: number;
    plan_date?: string | null;
    grade?: string;
    sections?: StudentSection[];
    section?: string | null;
    islamic_group?: string | null;
  },
): Promise<WeeklyPlanRow> {
  const source = await fetchWeeklyPlanById(sourcePlanId);
  if (!source) throw new Error("Weekly plan not found");
  const input = buildDuplicateWeeklyPlanInput(source, teacherId, overrides);
  return createWeeklyPlan(input);
}

export function isWeeklyPlanUniqueScopeError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  return e.code === "23505" || (e.message ?? "").includes("idx_weekly_plans_unique_scope");
}

export function fetchWeeklyPlanScopeOptions(
  assignments: TeacherAssignmentScope[],
  isLeadTeacher: boolean,
): WeeklyPlanScopeOption[] {
  if (isLeadTeacher) {
    return grades.flatMap((grade) => {
      const sections: (StudentSection | null)[] = ["A", "B", "C", "D", "E", "F", null];
      const groups: (IslamicGroup | null)[] = ["A", "B", null];
      const options: WeeklyPlanScopeOption[] = [];
      for (const section of sections) {
        for (const islamic_group of groups) {
          options.push({
            grade: grade.slug,
            section,
            islamic_group,
            label: `${grade.slug}${section ? ` / ${section}` : ""}${islamic_group ? ` / ${islamic_group}` : ""}`,
          });
        }
      }
      return options;
    });
  }

  return assignments.map((assignment) => ({
    grade: normalizeGradeSlug(assignment.grade),
    section: assignment.section,
    islamic_group: assignment.islamic_group,
    label: `${normalizeGradeSlug(assignment.grade)}${assignment.section ? ` / ${assignment.section}` : ""}${assignment.islamic_group ? ` / ${assignment.islamic_group}` : ""}`,
  }));
}
