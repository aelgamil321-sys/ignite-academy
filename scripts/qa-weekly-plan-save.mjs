/**
 * Weekly plan save regression: duplicate-scope resume, student_count CHECK safety, readable errors.
 * Run: npx tsx scripts/qa-weekly-plan-save.mjs
 */
import assert from "node:assert/strict";

const {
  isWeeklyPlanUniqueScopeError,
  isWeeklyPlanStudentCountCheckError,
  isValidWeeklyPlanStudentCount,
  normalizeWeeklyPlanStudentCountInput,
  prepareWeeklyPlanPersistenceFields,
  resolveWeeklyPlanStudentCountForCreate,
  resolveWeeklyPlanStudentCountForUpdate,
  calculateWeeklyPlanCompletion,
} = await import("../src/lib/weekly-planning.ts");
const { formatError } = await import("../src/lib/upload.ts");

const duplicateErr = {
  message: 'duplicate key value violates unique constraint "idx_weekly_plans_unique_scope"',
  code: "23505",
  details:
    "Key (teacher_id, week_number, grade, sections_key, islamic_group)=(..., 3, 6, A,B,C,D,E,F, B) already exists.",
  hint: null,
};

assert.equal(isWeeklyPlanUniqueScopeError(duplicateErr), true);
assert.equal(duplicateErr instanceof Error, false);
assert.equal(String(duplicateErr), "[object Object]");
assert.match(formatError(duplicateErr), /duplicate key value violates unique constraint/);
assert.match(formatError(duplicateErr), /code 23505/);

const studentCountErr = {
  message:
    'new row for relation "weekly_plans" violates check constraint "weekly_plans_student_count_check"',
  code: "23514",
  details: null,
  hint: null,
};
assert.equal(isWeeklyPlanStudentCountCheckError(studentCountErr), true);
assert.match(formatError(studentCountErr), /weekly_plans_student_count_check/);
assert.match(formatError(studentCountErr), /code 23514/);

const scope = prepareWeeklyPlanPersistenceFields({
  grade: "6",
  sections: ["A", "B", "C"],
  section: "A",
  islamic_group: "B",
});
assert.equal(scope.sections_key, "A,B,C");
assert.deepEqual(scope.sections, ["A", "B", "C"]);

assert.equal(isValidWeeklyPlanStudentCount(4), true);
assert.equal(isValidWeeklyPlanStudentCount(30), true);
assert.equal(isValidWeeklyPlanStudentCount(0), true);
assert.equal(isValidWeeklyPlanStudentCount(40), false);
assert.equal(isValidWeeklyPlanStudentCount(-1), false);
assert.equal(isValidWeeklyPlanStudentCount(null), false);
assert.equal(isValidWeeklyPlanStudentCount(Number.NaN), false);

assert.equal(normalizeWeeklyPlanStudentCountInput(4), 4);
assert.equal(normalizeWeeklyPlanStudentCountInput(40), null);
assert.equal(normalizeWeeklyPlanStudentCountInput(null), null);
assert.equal(normalizeWeeklyPlanStudentCountInput(Number.NaN), null);
assert.equal(normalizeWeeklyPlanStudentCountInput("31"), null);

assert.equal(
  resolveWeeklyPlanStudentCountForUpdate(40, 4, 4),
  undefined,
  "invalid patch preserves existing valid count",
);
assert.equal(
  resolveWeeklyPlanStudentCountForUpdate(null, 4, 4),
  null,
  "explicit null clears count when allowed",
);
assert.equal(
  resolveWeeklyPlanStudentCountForUpdate(6, 4, 4),
  6,
  "valid patch replaces existing count",
);
assert.equal(
  resolveWeeklyPlanStudentCountForUpdate(40, null, 4),
  4,
  "invalid patch falls back to authoritative scoped count",
);
assert.equal(
  resolveWeeklyPlanStudentCountForCreate(40, 4),
  4,
  "create uses authoritative count when patch invalid",
);
assert.equal(
  resolveWeeklyPlanStudentCountForCreate(40, null),
  null,
  "create inserts null when no valid count available",
);

const completePlanFields = {
  teacher_id: "teacher-a",
  plan_language: "en",
  week_number: 3,
  academic_year: "2026-2027",
  phase: "Middle",
  grade: "6",
  section: "A",
  sections: ["A", "B", "C", "D", "E", "F"],
  islamic_group: "B",
  student_count: 4,
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
};

const completionWithValidCount = calculateWeeklyPlanCompletion({
  id: "plan-1",
  status: "not_started",
  completion_percentage: 0,
  created_at: "",
  updated_at: "",
  ...completePlanFields,
});
assert.equal(completionWithValidCount.completed, 40, "40/40 completion preserved with valid student_count");
assert.equal(
  normalizeWeeklyPlanStudentCountInput(40),
  null,
  "invalid student_count is rejected before persistence",
);

console.log(JSON.stringify({ ok: true, openAiCalls: 0 }, null, 2));
console.log("=== WEEKLY PLAN SAVE QA PASS ===");
