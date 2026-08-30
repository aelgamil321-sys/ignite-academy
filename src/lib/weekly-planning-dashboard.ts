/**
 * Department Weekly Planning dashboard — shared data layer for Admin + Lead Teacher.
 */

import { supabase } from "@/integrations/supabase/client";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import type { TeacherAssignmentRow } from "@/lib/admin-teachers";
import { fetchAdminTeachers } from "@/lib/admin-teachers";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";
import {
  calculateWeeklyPlanCompletion,
  normalizeWeeklyPlanSections,
  weeklyPlanSectionsFromRow,
  weeklyPlanSectionsKey,
  WEEKLY_PLAN_COMPLETION_TOTAL,
  WEEKLY_PLAN_CORE_PLANNING_MAX,
  WEEKLY_PLAN_DIFFERENTIATION_MAX,
  WEEKLY_PLAN_PERIOD_MAX,
  WEEKLY_PLAN_REFLECTION_MAX,
  type WeeklyPlanCompletionBreakdown,
  type WeeklyPlanRow,
  type WeeklyPlanStatus,
} from "@/lib/weekly-planning";

export const WEEKLY_PLANNING_WEEKS = 30;

export type TeacherPlanningScope = {
  grade: string;
  islamic_group: string;
  sections: StudentSection[];
  sections_key: string;
};

export type DepartmentTeacherProfile = {
  userId: string;
  fullName: string;
  email: string;
  isLeadTeacher: boolean;
  assignments: TeacherAssignmentRow[];
  scopes: TeacherPlanningScope[];
};

export type DepartmentTrackerRow = {
  rowKey: string;
  rowKind: "expected_slot" | "extra_plan";
  planId: string | null;
  contributingPlanIds: string[];
  isSubmitted: boolean;
  week_number: number;
  teacher_id: string;
  teacherName: string;
  grade: string;
  /** Authorized sections for this expected teaching scope. */
  expectedSections: StudentSection[];
  coveredSections: StudentSection[];
  missingSections: StudentSection[];
  sections_key: string;
  islamic_group: string | null;
  plan_date: string | null;
  domain: string | null;
  unit: string | null;
  lesson_title: string | null;
  completion: WeeklyPlanCompletionBreakdown;
  status: WeeklyPlanStatus;
  nextActionKey: string;
};

export type DepartmentTeacherSummary = {
  teacher_id: string;
  teacherName: string;
  assignedGrades: string[];
  plansExpected: number;
  plansCreated: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overallCompletionPct: number;
};

export type DepartmentDashboardMetrics = {
  totalTeachers: number;
  totalWeeklyPlans: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overallCompletionPct: number;
  avgCorePlanning: number;
  avgDifferentiation: number;
  avgFirstPeriod: number;
  avgSecondPeriod: number;
  avgReflection: number;
};

export type DepartmentWeekSnapshot = {
  week_number: number;
  submitted: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  expected: number;
};

export type DepartmentWeeklyPlanningSnapshot = {
  teachers: DepartmentTeacherProfile[];
  plans: WeeklyPlanRow[];
  trackerRows: DepartmentTrackerRow[];
  teacherSummaries: DepartmentTeacherSummary[];
  metrics: DepartmentDashboardMetrics;
  weekSnapshots: DepartmentWeekSnapshot[];
};

export type DepartmentDashboardFilters = {
  teacherId?: string;
  week?: string;
  grade?: string;
  section?: string;
  islamicGroup?: string;
  status?: WeeklyPlanStatus | "";
  domain?: string;
  unit?: string;
};

export function expectedScopeKey(
  teacherId: string,
  week: number,
  grade: string,
  islamicGroup: string | null,
): string {
  return `${teacherId}|${week}|${normalizeGradeSlug(grade) || grade}|${islamicGroup ?? ""}`;
}

/** @deprecated Slot identity no longer includes sections_key — use expectedScopeKey. */
export function planSlotKey(
  teacherId: string,
  week: number,
  grade: string,
  sectionsKey: string,
  islamicGroup: string | null,
): string {
  return `${teacherId}|${week}|${normalizeGradeSlug(grade) || grade}|${sectionsKey}|${islamicGroup ?? ""}`;
}

export function planMatchesExpectedScope(
  plan: WeeklyPlanRow,
  teacherId: string,
  week: number,
  scope: TeacherPlanningScope,
): boolean {
  if (plan.teacher_id !== teacherId) return false;
  if (plan.week_number !== week) return false;
  if (normalizeGradeSlug(plan.grade) !== normalizeGradeSlug(scope.grade)) return false;
  if (plan.islamic_group !== scope.islamic_group) return false;
  return true;
}

export function unionPlanSections(plans: WeeklyPlanRow[]): StudentSection[] {
  const set = new Set<StudentSection>();
  for (const plan of plans) {
    for (const section of weeklyPlanSectionsFromRow(plan)) {
      set.add(section);
    }
  }
  return normalizeWeeklyPlanSections(Array.from(set));
}

export function missingExpectedSections(
  expectedSections: StudentSection[],
  coveredSections: StudentSection[],
): StudentSection[] {
  const covered = new Set(coveredSections);
  return expectedSections.filter((section) => !covered.has(section));
}

export function averageCompletionBreakdown(
  completions: WeeklyPlanCompletionBreakdown[],
): WeeklyPlanCompletionBreakdown {
  if (completions.length === 0) return emptyCompletion();
  const n = completions.length;
  const sum = (field: keyof WeeklyPlanCompletionBreakdown) =>
    completions.reduce((acc, c) => acc + (c[field] as number), 0) / n;
  const percentage = completions.reduce((acc, c) => acc + c.percentage, 0) / n;
  const completed = Math.round(completions.reduce((acc, c) => acc + c.completed, 0) / n);
  return {
    corePlanning: sum("corePlanning"),
    differentiation: sum("differentiation"),
    firstPeriod: sum("firstPeriod"),
    firstPeriodMax: WEEKLY_PLAN_PERIOD_MAX,
    secondPeriod: sum("secondPeriod"),
    secondPeriodMax: WEEKLY_PLAN_PERIOD_MAX,
    reflection: sum("reflection"),
    completed,
    total: WEEKLY_PLAN_COMPLETION_TOTAL,
    percentage,
    status: "in_progress",
    missingFields: [],
  };
}

export function deriveExpectedSlotStatus(
  expectedSections: StudentSection[],
  contributingPlans: WeeklyPlanRow[],
): {
  status: WeeklyPlanStatus;
  completion: WeeklyPlanCompletionBreakdown;
  nextActionKey: string;
  coveredSections: StudentSection[];
  missingSections: StudentSection[];
} {
  if (contributingPlans.length === 0) {
    return {
      status: "not_started",
      completion: emptyCompletion(),
      nextActionKey: "wp_next_action_core",
      coveredSections: [],
      missingSections: [...expectedSections],
    };
  }

  const coveredSections = unionPlanSections(contributingPlans);
  const missingSections = missingExpectedSections(expectedSections, coveredSections);
  const planCompletions = contributingPlans.map((plan) => calculateWeeklyPlanCompletion(plan));
  const completion = averageCompletionBreakdown(planCompletions);
  const allPlansComplete = planCompletions.every((c) => c.status === "complete");
  const fullSectionCoverage = missingSections.length === 0;

  let status: WeeklyPlanStatus = "in_progress";
  if (fullSectionCoverage && allPlansComplete) {
    status = "complete";
    completion.status = "complete";
  } else {
    completion.status = "in_progress";
  }

  const worstCompletion = planCompletions.reduce((worst, current) =>
    current.completed < worst.completed ? current : worst,
  );
  const nextActionKey = fullSectionCoverage
    ? deriveNextActionKey(worstCompletion)
    : "wp_dept_next_action_missing_sections";

  return {
    status,
    completion,
    nextActionKey,
    coveredSections,
    missingSections,
  };
}

/** Group assignments into one scope per grade + islamic group (multi-section = one plan). */
export function deriveTeacherPlanningScopes(
  assignments: TeacherAssignmentRow[],
): TeacherPlanningScope[] {
  const buckets = new Map<string, Set<StudentSection>>();

  for (const assignment of assignments) {
    if (!assignment.islamic_group) continue;
    const grade = normalizeGradeSlug(assignment.grade) || assignment.grade;
    const bucketKey = `${grade}|${assignment.islamic_group}`;
    const set = buckets.get(bucketKey) ?? new Set<StudentSection>();
    if (assignment.section) {
      set.add(assignment.section as StudentSection);
    } else {
      for (const section of STUDENT_SECTIONS) set.add(section);
    }
    buckets.set(bucketKey, set);
  }

  return Array.from(buckets.entries()).map(([key, sectionSet]) => {
    const [grade, islamic_group] = key.split("|");
    const sections = normalizeWeeklyPlanSections(Array.from(sectionSet));
    return {
      grade,
      islamic_group,
      sections,
      sections_key: weeklyPlanSectionsKey(sections),
    };
  });
}

export function deriveNextActionKey(completion: WeeklyPlanCompletionBreakdown): string {
  if (completion.status === "complete") return "wp_next_action_complete";
  if (completion.corePlanning < WEEKLY_PLAN_CORE_PLANNING_MAX) return "wp_next_action_core";
  if (completion.differentiation < WEEKLY_PLAN_DIFFERENTIATION_MAX) return "wp_next_action_diff";
  if (completion.firstPeriod < WEEKLY_PLAN_PERIOD_MAX) return "wp_next_action_first";
  if (completion.secondPeriod < WEEKLY_PLAN_PERIOD_MAX) return "wp_next_action_second";
  return "wp_next_action_reflection";
}

function emptyCompletion(): WeeklyPlanCompletionBreakdown {
  return {
    corePlanning: 0,
    differentiation: 0,
    firstPeriod: 0,
    firstPeriodMax: WEEKLY_PLAN_PERIOD_MAX,
    secondPeriod: 0,
    secondPeriodMax: WEEKLY_PLAN_PERIOD_MAX,
    reflection: 0,
    completed: 0,
    total: WEEKLY_PLAN_COMPLETION_TOTAL,
    percentage: 0,
    status: "not_started",
    missingFields: [],
  };
}

export function buildDepartmentWeeklyPlanningSnapshot(
  teachers: DepartmentTeacherProfile[],
  plans: WeeklyPlanRow[],
): DepartmentWeeklyPlanningSnapshot {
  const teacherById = new Map(teachers.map((t) => [t.userId, t]));
  const plansByScope = new Map<string, WeeklyPlanRow[]>();
  const accountedPlanIds = new Set<string>();

  for (const plan of plans) {
    const key = expectedScopeKey(plan.teacher_id, plan.week_number, plan.grade, plan.islamic_group);
    const bucket = plansByScope.get(key) ?? [];
    bucket.push(plan);
    plansByScope.set(key, bucket);
  }

  const trackerRows: DepartmentTrackerRow[] = [];
  const expectedSlotKeys = new Set<string>();

  for (const teacher of teachers) {
    for (const scope of teacher.scopes) {
      for (let week = 1; week <= WEEKLY_PLANNING_WEEKS; week++) {
        const scopeKey = expectedScopeKey(
          teacher.userId,
          week,
          scope.grade,
          scope.islamic_group,
        );
        expectedSlotKeys.add(scopeKey);

        const contributingPlans = (plansByScope.get(scopeKey) ?? []).filter((plan) =>
          planMatchesExpectedScope(plan, teacher.userId, week, scope),
        );
        for (const plan of contributingPlans) accountedPlanIds.add(plan.id);

        const slotStatus = deriveExpectedSlotStatus(scope.sections, contributingPlans);
        const primaryPlan = contributingPlans[0] ?? null;

        trackerRows.push({
          rowKey: scopeKey,
          rowKind: "expected_slot",
          planId: primaryPlan?.id ?? null,
          contributingPlanIds: contributingPlans.map((p) => p.id),
          isSubmitted: contributingPlans.length > 0,
          week_number: week,
          teacher_id: teacher.userId,
          teacherName: teacher.fullName,
          grade: scope.grade,
          expectedSections: scope.sections,
          coveredSections: slotStatus.coveredSections,
          missingSections: slotStatus.missingSections,
          sections_key: scope.sections_key,
          islamic_group: scope.islamic_group,
          plan_date: primaryPlan?.plan_date ?? null,
          domain: primaryPlan?.domain ?? null,
          unit: primaryPlan?.unit ?? null,
          lesson_title:
            contributingPlans.length > 1
              ? `${contributingPlans.length} plans`
              : (primaryPlan?.lesson_title ?? null),
          completion: slotStatus.completion,
          status: slotStatus.status,
          nextActionKey: slotStatus.nextActionKey,
        });
      }
    }
  }

  for (const plan of plans) {
    if (accountedPlanIds.has(plan.id)) continue;
    const teacher = teacherById.get(plan.teacher_id);
    const sections = weeklyPlanSectionsFromRow(plan);
    const completion = calculateWeeklyPlanCompletion(plan);
    trackerRows.push({
      rowKey: `extra-${plan.id}`,
      rowKind: "extra_plan",
      planId: plan.id,
      contributingPlanIds: [plan.id],
      isSubmitted: true,
      week_number: plan.week_number,
      teacher_id: plan.teacher_id,
      teacherName: teacher?.fullName ?? "—",
      grade: plan.grade,
      expectedSections: sections,
      coveredSections: sections,
      missingSections: [],
      sections_key: weeklyPlanSectionsKey(sections),
      islamic_group: plan.islamic_group,
      plan_date: plan.plan_date,
      domain: plan.domain,
      unit: plan.unit,
      lesson_title: plan.lesson_title,
      completion,
      status: completion.status,
      nextActionKey: deriveNextActionKey(completion),
    });
  }

  const expectedSlotRows = trackerRows.filter((r) => r.rowKind === "expected_slot");

  const teacherSummaries: DepartmentTeacherSummary[] = teachers.map((teacher) => {
    const rows = expectedSlotRows.filter((r) => r.teacher_id === teacher.userId);
    const teacherPlans = plans.filter((p) => p.teacher_id === teacher.userId);
    const completed = rows.filter((r) => r.status === "complete").length;
    const inProgress = rows.filter((r) => r.status === "in_progress").length;
    const notStarted = rows.filter((r) => r.status === "not_started").length;
    const grades = [...new Set(teacher.scopes.map((s) => s.grade))];
    const totalCompletedPoints = rows.reduce((sum, r) => sum + r.completion.completed, 0);
    const maxPoints = rows.length * WEEKLY_PLAN_COMPLETION_TOTAL;
    return {
      teacher_id: teacher.userId,
      teacherName: teacher.fullName,
      assignedGrades: grades,
      plansExpected: rows.length,
      plansCreated: teacherPlans.length,
      completed,
      inProgress,
      notStarted,
      overallCompletionPct: maxPoints > 0 ? Math.round((totalCompletedPoints / maxPoints) * 100) : 0,
    };
  });

  const metrics: DepartmentDashboardMetrics = {
    totalTeachers: teachers.length,
    totalWeeklyPlans: plans.length,
    completed: expectedSlotRows.filter((r) => r.status === "complete").length,
    inProgress: expectedSlotRows.filter((r) => r.status === "in_progress").length,
    notStarted: expectedSlotRows.filter((r) => r.status === "not_started").length,
    overallCompletionPct:
      expectedSlotRows.length > 0
        ? Math.round(
            (expectedSlotRows.reduce((s, r) => s + r.completion.completed, 0) /
              (expectedSlotRows.length * WEEKLY_PLAN_COMPLETION_TOTAL)) *
              100,
          )
        : 0,
    avgCorePlanning:
      plans.length > 0
        ? plans.reduce((s, p) => s + calculateWeeklyPlanCompletion(p).corePlanning, 0) / plans.length
        : 0,
    avgDifferentiation:
      plans.length > 0
        ? plans.reduce((s, p) => s + calculateWeeklyPlanCompletion(p).differentiation, 0) / plans.length
        : 0,
    avgFirstPeriod:
      plans.length > 0
        ? plans.reduce((s, p) => s + calculateWeeklyPlanCompletion(p).firstPeriod, 0) / plans.length
        : 0,
    avgSecondPeriod:
      plans.length > 0
        ? plans.reduce((s, p) => s + calculateWeeklyPlanCompletion(p).secondPeriod, 0) / plans.length
        : 0,
    avgReflection:
      plans.length > 0
        ? plans.reduce((s, p) => s + calculateWeeklyPlanCompletion(p).reflection, 0) / plans.length
        : 0,
  };

  const weekSnapshots: DepartmentWeekSnapshot[] = Array.from({ length: WEEKLY_PLANNING_WEEKS }, (_, i) => {
    const week = i + 1;
    const rows = expectedSlotRows.filter((r) => r.week_number === week);
    return {
      week_number: week,
      expected: rows.length,
      submitted: rows.filter((r) => r.isSubmitted).length,
      completed: rows.filter((r) => r.status === "complete").length,
      inProgress: rows.filter((r) => r.status === "in_progress").length,
      notStarted: rows.filter((r) => r.status === "not_started").length,
    };
  });

  return {
    teachers,
    plans,
    trackerRows,
    teacherSummaries,
    metrics,
    weekSnapshots,
  };
}

export function filterDepartmentTrackerRows(
  rows: DepartmentTrackerRow[],
  filters: DepartmentDashboardFilters,
): DepartmentTrackerRow[] {
  return rows.filter((row) => {
    if (filters.teacherId && row.teacher_id !== filters.teacherId) return false;
    if (filters.week && String(row.week_number) !== filters.week) return false;
    if (filters.grade && normalizeGradeSlug(row.grade) !== normalizeGradeSlug(filters.grade)) return false;
    if (filters.section && !row.expectedSections.includes(filters.section as StudentSection)) return false;
    if (filters.islamicGroup && row.islamic_group !== filters.islamicGroup) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.domain && (row.domain ?? "") !== filters.domain) return false;
    if (filters.unit && (row.unit ?? "") !== filters.unit) return false;
    return true;
  });
}

import { isAdminOrLeadTeacher } from "@/lib/school-management-access";

export async function canAccessWeeklyPlanningDepartmentDashboard(userId: string): Promise<boolean> {
  return isAdminOrLeadTeacher(userId);
}

export async function fetchDepartmentWeeklyPlanningSnapshot(): Promise<DepartmentWeeklyPlanningSnapshot> {
  const [teacherRows, plansRes, leadRes] = await Promise.all([
    fetchAdminTeachers(),
    supabase.from("weekly_plans").select("*").order("week_number"),
    supabase.from("teacher_profiles").select("user_id, is_lead_teacher"),
  ]);

  if (plansRes.error) throw plansRes.error;
  if (leadRes.error) throw leadRes.error;

  const leadMap = new Map(
    (leadRes.data ?? []).map((row) => [row.user_id, row.is_lead_teacher ?? false]),
  );

  const teachers: DepartmentTeacherProfile[] = teacherRows
    .filter((t) => t.assignments.length > 0 || leadMap.get(t.userId))
    .map((t) => ({
      userId: t.userId,
      fullName: t.fullName,
      email: t.email,
      isLeadTeacher: leadMap.get(t.userId) ?? false,
      assignments: t.assignments,
      scopes: deriveTeacherPlanningScopes(t.assignments),
    }))
    .filter((t) => t.scopes.length > 0 || t.isLeadTeacher);

  const plans = (plansRes.data ?? []) as WeeklyPlanRow[];
  return buildDepartmentWeeklyPlanningSnapshot(teachers, plans);
}

export function departmentFilterOptions(snapshot: DepartmentWeeklyPlanningSnapshot) {
  const grades = new Set<string>();
  const sections = new Set<string>();
  const groups = new Set<string>();
  const domains = new Set<string>();
  const units = new Set<string>();

  for (const row of snapshot.trackerRows) {
    grades.add(normalizeGradeSlug(row.grade) || row.grade);
    for (const s of row.expectedSections) sections.add(s);
    for (const s of row.coveredSections) sections.add(s);
    if (row.islamic_group) groups.add(row.islamic_group);
    if (row.domain) domains.add(row.domain);
    if (row.unit) units.add(row.unit);
  }

  return {
    teachers: snapshot.teachers.map((t) => ({ id: t.userId, name: t.fullName })),
    grades: [...grades].sort(),
    sections: [...sections].sort(),
    islamicGroups: [...groups].sort(),
    domains: [...domains].sort(),
    units: [...units].sort(),
    islamicGroupOptions: ISLAMIC_GROUPS,
  };
}
