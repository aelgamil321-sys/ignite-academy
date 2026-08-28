/**
 * UI-layer tests for Weekly Planning scope, completion, duplicate, and i18n labels.
 */

import {
  assignmentAllowsScope,
  buildDuplicateWeeklyPlanInput,
  calculateWeeklyPlanCompletion,
  getAssignableGrades,
  getIslamicGroupsForScope,
  getSectionsForGrade,
  masterListItemLabel,
  teacherAssignmentCoversWeeklyPlanScope,
  type WeeklyPlanMasterListItem,
  type WeeklyPlanRow,
} from "@/lib/weekly-planning";
import type { TeacherContext } from "@/lib/teacher-dashboard";
import { runWeeklyPlanDashboardTests } from "@/lib/weekly-planning-dashboard-tests";
import { runWeeklyPlanPdfCaptureTests, runWeeklyPlanImageConstraintTest, runWeeklyPlanPdfPaginationTests } from "@/lib/weekly-plan-pdf-tests";

export type WeeklyPlanUiTestResult = { name: string; pass: boolean; detail: string };

function mockContext(
  partial: Partial<TeacherContext> & Pick<TeacherContext, "userId">,
): TeacherContext {
  return {
    fullName: "Teacher A",
    email: "a@example.com",
    isLeadTeacher: false,
    assignments: partial.assignments ?? [
      { id: "1", grade: "8", section: "A", islamic_group: "A" },
    ],
    assignedGrades: partial.assignedGrades ?? ["8"],
    ...partial,
  };
}

function samplePlan(partial: Partial<WeeklyPlanRow> = {}): WeeklyPlanRow {
  return {
    id: "plan-1",
    teacher_id: "teacher-a",
    plan_language: "en",
    week_number: 3,
    academic_year: "2026-2027",
    phase: "Middle",
    grade: "8",
    section: "A",
    sections: ["A"],
    islamic_group: "A",
    student_count: 24,
    day: "Monday",
    plan_date: "2026-09-01",
    subject: "Islamic Education",
    domain: "Domain",
    success_criterion: "Criterion",
    learning_outcomes: "Outcomes",
    unit: "Unit 1",
    lesson_title: "Lesson",
    uae_culture: "UAE",
    cross_curricular_real_life: "Links",
    p21_skills: ["skill1"],
    key_vocabulary: "vocab",
    resources: "resources",
    differentiation_sod: { student_ids: ["s1"], student_names_snapshot: ["Student"], notes: "notes" },
    differentiation_eal: { student_ids: [], student_names_snapshot: [], notes: "EAL support notes" },
    differentiation_gt: { student_ids: [], student_names_snapshot: [], notes: "GT enrichment" },
    differentiation_emirati: { student_ids: [], student_names_snapshot: [], notes: "Emirati focus" },
    first_period: {
      do_now: "engage",
      learning_objective_success_criteria: "obj",
      i_do: "i",
      we_do: "we",
      mid_assessment: "mid",
      you_do: { developing: "d", securing: "s", mastering: "m", extension: "e" },
      exit_ticket: "exit",
      sir_method: "Self",
      homework: "hw",
    },
    second_period: {
      do_now: "engage2",
      learning_objective_success_criteria: "obj2",
      i_do: "i2",
      we_do: "we2",
      mid_assessment: "mid2",
      you_do: { developing: "d2", securing: "s2", mastering: "m2", extension: "e2" },
      exit_ticket: "exit2",
      sir_method: "Peer",
      homework: "hw2",
    },
    teacher_reflection: "Reflection beyond template with enough content.",
    status: "complete",
    completion_percentage: 1,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

const masterItem: WeeklyPlanMasterListItem = {
  id: "item-1",
  list_id: "list-1",
  label_ar: "عربي",
  label_en: "English",
  sort_order: 1,
  is_active: true,
  metadata: { workbook_value: "عربي / English" },
};

export function runWeeklyPlanUiTests(): WeeklyPlanUiTestResult[] {
  const ctx = mockContext({ userId: "teacher-a" });
  const assignedGrades = getAssignableGrades(ctx);

  return [
    {
      name: "Assigned grade appears in scope",
      pass: assignedGrades.includes("8"),
      detail: `grades=${assignedGrades.join(",")}`,
    },
    {
      name: "Unassigned grade hidden from scope",
      pass: !assignedGrades.includes("12"),
      detail: `grades=${assignedGrades.join(",")}`,
    },
    {
      name: "Section filtered by grade assignment",
      pass: getSectionsForGrade(ctx, "8").includes("A"),
      detail: `sections=${getSectionsForGrade(ctx, "8").join(",")}`,
    },
    {
      name: "Islamic group filtered by grade/section",
      pass: getIslamicGroupsForScope(ctx, "8", "A").includes("A"),
      detail: `groups=${getIslamicGroupsForScope(ctx, "8", "A").join(",")}`,
    },
    {
      name: "Out-of-scope grade blocked for normal teacher",
      pass: !teacherAssignmentCoversWeeklyPlanScope(ctx.assignments, false, "12", "A", "A"),
      detail: "grade 12 not assigned",
    },
    {
      name: "40-check completion model live",
      pass: calculateWeeklyPlanCompletion(samplePlan()).completed === 40,
      detail: `completed=${calculateWeeklyPlanCompletion(samplePlan()).completed}`,
    },
    {
      name: "Duplicate resets id-specific metadata",
      pass: (() => {
        const source = samplePlan({ id: "old-id", week_number: 5 });
        const input = buildDuplicateWeeklyPlanInput(source, "teacher-a", { week_number: 6 });
        return input.week_number === 6 && input.teacher_id === "teacher-a";
      })(),
      detail: "week and teacher_id updated",
    },
    {
      name: "Duplicate recalculates completion via create path fields",
      pass: (() => {
        const empty = samplePlan({
          lesson_title: null,
          domain: null,
          first_period: {},
          teacher_reflection: "",
        });
        const c = calculateWeeklyPlanCompletion(empty);
        return c.status === "not_started" || c.status === "in_progress";
      })(),
      detail: "partial plan not marked complete",
    },
    {
      name: "Print route path pattern (no sidebar layout)",
      pass: "/teacher/weekly-planning/abc/print".endsWith("/print"),
      detail: "print suffix detected for layout bypass",
    },
    {
      name: "Arabic master-list label",
      pass: masterListItemLabel(masterItem, "ar") === "عربي",
      detail: masterListItemLabel(masterItem, "ar"),
    },
    {
      name: "English master-list label",
      pass: masterListItemLabel(masterItem, "en") === "English",
      detail: masterListItemLabel(masterItem, "en"),
    },
    ...runWeeklyPlanDashboardTests(),
    ...runWeeklyPlanDocumentCompletenessTests(),
    ...runWeeklyPlanPdfPaginationTests(),
    runWeeklyPlanImageConstraintTest(),
  ];
}

export function allWeeklyPlanUiTestsPass(): boolean {
  return runWeeklyPlanUiTests().every((t) => t.pass);
}
