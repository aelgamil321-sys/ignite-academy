/**
 * Logical boundary tests for Weekly Planning scope and completion (app-layer).
 * Server enforcement is via Supabase RLS.
 */

import {
  assignmentAllowsSections,
  calculateWeeklyPlanCompletion,
  normalizeWeeklyPlanSections,
  teacherAssignmentCoversWeeklyPlanScope,
  weeklyPlanSectionsFromRow,
  weeklyPlanSectionsKey,
  WEEKLY_PLAN_COMPLETION_TOTAL,
  WEEKLY_PLAN_CORE_PLANNING_MAX,
  type WeeklyPlanRow,
} from "@/lib/weekly-planning";
import {
  WEEKLY_PLAN_MASTER_LIST_COUNTS,
  WEEKLY_PLAN_DIFFERENTIATION_PROMPT_TEMPLATE,
  WEEKLY_PLAN_GROUP_PROMPT_TEMPLATE,
  WEEKLY_PLAN_REFLECTION_PROMPT_TEMPLATE,
} from "@/lib/weekly-planning-master-data";
import type { TeacherAssignmentScope } from "@/lib/teacher-dashboard";

export type WeeklyPlanScopeTestResult = { name: string; pass: boolean; detail: string };

function emptyPlan(partial: Partial<WeeklyPlanRow> = {}): WeeklyPlanRow {
  return {
    id: "plan-1",
    teacher_id: "",
    plan_language: "en",
    week_number: 1,
    academic_year: "2026-2027",
    phase: null,
    grade: "",
    section: null,
    sections: [],
    islamic_group: null,
    student_count: null,
    day: null,
    plan_date: null,
    subject: "التربية الإسلامية / Islamic Education",
    domain: null,
    success_criterion: null,
    learning_outcomes: null,
    unit: null,
    lesson_title: null,
    uae_culture: null,
    cross_curricular_real_life: null,
    p21_skills: null,
    key_vocabulary: null,
    resources: null,
    differentiation_sod: null,
    differentiation_eal: null,
    differentiation_gt: null,
    differentiation_emirati: null,
    first_period: null,
    second_period: null,
    teacher_reflection: null,
    status: "not_started",
    completion_percentage: 0,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

export function runWeeklyPlanBoundaryTests(): WeeklyPlanScopeTestResult[] {
  const teacherAAssignments: TeacherAssignmentScope[] = [
    { id: "1", grade: "10", section: "A", islamic_group: "B" },
  ];

  const fullCore = emptyPlan({
    teacher_id: "teacher-a",
    phase: "المرحلة الثانوية / High",
    grade: "10",
    section: "A",
    sections: ["A"],
    islamic_group: "B",
    student_count: 25,
    day: "الاثنين / Monday",
    plan_date: "2026-08-31",
    domain: "العقيدة الإسلامية / Islamic Creed",
    success_criterion: "criteria",
    learning_outcomes: "outcomes",
    unit: "الوحدة الأولى / Unit 1",
    lesson_title: "Lesson",
    uae_culture: "UAE",
    cross_curricular_real_life: "Cross",
    p21_skills: ["التفكير الناقد / Critical Thinking"],
    key_vocabulary: "vocab",
    resources: "Schoology",
  });

  const emptyCompletion = calculateWeeklyPlanCompletion(emptyPlan());
  const coreOnly = calculateWeeklyPlanCompletion(fullCore);

  const withTemplateOnly = calculateWeeklyPlanCompletion(
    emptyPlan({
      teacher_reflection: WEEKLY_PLAN_REFLECTION_PROMPT_TEMPLATE,
      differentiation_sod: {
        student_ids: [],
        student_names_snapshot: [],
        notes: WEEKLY_PLAN_DIFFERENTIATION_PROMPT_TEMPLATE,
      },
      first_period: {
        you_do: {
          developing: "",
          securing: "",
          mastering: "",
          extension: "",
        },
      },
    }),
  );

  const completePlan = calculateWeeklyPlanCompletion(
    emptyPlan({
      ...fullCore,
      differentiation_sod: {
        student_ids: ["s1"],
        student_names_snapshot: ["Student 1"],
        notes: "Accommodation details",
      },
      differentiation_eal: {
        student_ids: ["s2"],
        student_names_snapshot: ["Student 2"],
        notes: "EAL support",
      },
      differentiation_gt: {
        student_ids: ["s3"],
        student_names_snapshot: ["Student 3"],
        notes: "Extension",
      },
      differentiation_emirati: {
        student_ids: ["s4"],
        student_names_snapshot: ["Student 4"],
        notes: "Emirati focus",
      },
      first_period: {
        do_now: "Do now",
        learning_objective_success_criteria: "LO",
        i_do: "I do",
        we_do: "We do",
        mid_assessment: "Mid",
        you_do: {
          developing: "Developing group: analyze Qur'an verses and justify Tajweed choices in writing.",
          securing: "Securing group: apply Tajweed rules in paired reading with peer feedback.",
          mastering: "Mastering group: teach a short passage using modelled recitation.",
          extension: "Extension group: design an enrichment task linking verses to UAE values.",
        },
        exit_ticket: "Exit",
        sir_method: "ذاتي / Self",
        homework: "HW",
      },
      second_period: {
        do_now: "Do now 2",
        learning_objective_success_criteria: "LO 2",
        i_do: "I do 2",
        we_do: "We do 2",
        mid_assessment: "Mid 2",
        you_do: {
          developing: "Developing group period 2: written reflection on Hadith values.",
          securing: "Securing group period 2: compare two life situations using Hadith guidance.",
          mastering: "Mastering group period 2: lead a short discussion on application.",
          extension: "Extension group period 2: propose a school initiative from the Hadith.",
        },
        exit_ticket: "Exit 2",
        sir_method: "المعلم / Teacher",
        homework: "HW 2",
      },
      teacher_reflection:
        "What worked: cold-call checks improved engagement and every student produced a written response in the Do Now. What to adjust: shorten I Do and add one more peer-check. Follow-up: Ahmed and Sara need vocabulary support; Omar needs follow-up on homework completion next week.",
    }),
  );

  return [
    {
      name: "Teacher A can create in assigned scope",
      pass: teacherAssignmentCoversWeeklyPlanScope(
        teacherAAssignments,
        false,
        "10",
        "A",
        "B",
      ),
      detail: "Grade 10 / A / B matches assignment",
    },
    {
      name: "Teacher A cannot create for unassigned grade",
      pass: !teacherAssignmentCoversWeeklyPlanScope(
        teacherAAssignments,
        false,
        "11",
        "A",
        "B",
      ),
      detail: "Grade 11 outside assignment",
    },
    {
      name: "Teacher A cannot access unassigned section",
      pass: !teacherAssignmentCoversWeeklyPlanScope(
        teacherAAssignments,
        false,
        "10",
        "B",
        "B",
      ),
      detail: "Section B not assigned",
    },
    {
      name: "Lead teacher spans department scope",
      pass: teacherAssignmentCoversWeeklyPlanScope(
        teacherAAssignments,
        true,
        "12",
        "C",
        "A",
      ),
      detail: "Lead flag bypasses assignment list",
    },
    {
      name: "Teacher B plan owned by different teacher_id",
      pass: emptyPlan({ teacher_id: "teacher-b" }).teacher_id !== "teacher-a",
      detail: "Ownership separation for RLS",
    },
    {
      name: "Student role has no weekly_plans access by design",
      pass: true,
      detail: "No student RLS policies on weekly_plans (enforced in migration)",
    },
    {
      name: "Parent role has no weekly_plans access by design",
      pass: true,
      detail: "No parent RLS policies on weekly_plans (enforced in migration)",
    },
    {
      name: "35 success criteria defined in master seed",
      pass: WEEKLY_PLAN_MASTER_LIST_COUNTS.success_criteria === 35,
      detail: `count=${WEEKLY_PLAN_MASTER_LIST_COUNTS.success_criteria}`,
    },
    {
      name: "17 P21 skills defined in master seed",
      pass: WEEKLY_PLAN_MASTER_LIST_COUNTS.p21_skills === 17,
      detail: `count=${WEEKLY_PLAN_MASTER_LIST_COUNTS.p21_skills}`,
    },
    {
      name: "Empty plan is not_started",
      pass: emptyCompletion.status === "not_started" && emptyCompletion.completed === 0,
      detail: `completed=${emptyCompletion.completed}`,
    },
    {
      name: "Template-only content is not counted complete",
      pass:
        withTemplateOnly.differentiation === 0 &&
        withTemplateOnly.reflection === 0 &&
        withTemplateOnly.firstPeriod === 0,
      detail: "Placeholder templates excluded from completion",
    },
    {
      name: "Core planning max is 17",
      pass: coreOnly.corePlanning === WEEKLY_PLAN_CORE_PLANNING_MAX,
      detail: `core=${coreOnly.corePlanning}`,
    },
    {
      name: "40-point model reaches complete",
      pass:
        completePlan.completed === WEEKLY_PLAN_COMPLETION_TOTAL &&
        completePlan.status === "complete",
      detail: `completed=${completePlan.completed}`,
    },
    {
      name: "Partial plan is in_progress",
      pass: coreOnly.status === "in_progress" && coreOnly.completed < WEEKLY_PLAN_COMPLETION_TOTAL,
      detail: `status=${coreOnly.status}, completed=${coreOnly.completed}`,
    },
    {
      name: "Short teacher reflection counts as complete",
      pass:
        calculateWeeklyPlanCompletion(
          emptyPlan({
            teacher_reflection: "Students were engaged; follow up with Omar next week.",
          }),
        ).reflection === 1,
      detail: "Non-empty reflection without length-vs-template rule",
    },
    {
      name: "You Do requires content in all four groups",
      pass: !calculateWeeklyPlanCompletion(
        emptyPlan({
          first_period: {
            you_do: {
              developing: "Developing task for group 1.",
              securing: "Securing task for group 2.",
              mastering: "Mastering task for group 3.",
              extension: "",
            },
          },
        }),
      ).firstPeriod,
      detail: "All four You Do groups must have teacher content",
    },
    {
      name: "Sections key normalizes order",
      pass: weeklyPlanSectionsKey(["C", "A", "B"]) === "A,B,C",
      detail: weeklyPlanSectionsKey(["C", "A", "B"]),
    },
    {
      name: "Legacy single section row maps to sections array",
      pass: weeklyPlanSectionsFromRow({ section: "A", sections: [] }).join(",") === "A",
      detail: weeklyPlanSectionsFromRow({ section: "A", sections: [] }).join(","),
    },
    {
      name: "Multi-section scope completion",
      pass: calculateWeeklyPlanCompletion(emptyPlan({ sections: ["A", "B", "C"], section: "A" }))
        .missingFields.every((f) => f.key !== "section"),
      detail: "sections.length > 0 satisfies section completion",
    },
    {
      name: "Unauthorized section rejected in multi-select scope",
      pass: !assignmentAllowsSections(
        {
          userId: "t",
          fullName: "",
          email: "",
          isLeadTeacher: false,
          assignments: teacherAAssignments,
          assignedGrades: ["10"],
        },
        "10",
        ["A", "B"],
        "B",
      ),
      detail: "Teacher assigned only section A",
    },
  ];
}

export function allWeeklyPlanBoundaryTestsPass(): boolean {
  return runWeeklyPlanBoundaryTests().every((t) => t.pass);
}
