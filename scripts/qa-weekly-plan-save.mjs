/**
 * Weekly plan save regression: duplicate-scope resume + readable Supabase errors.
 * Run: node scripts/qa-weekly-plan-save.mjs
 */
import assert from "node:assert/strict";

const { isWeeklyPlanUniqueScopeError, prepareWeeklyPlanPersistenceFields } = await import(
  "../src/lib/weekly-planning.ts"
);
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

const scope = prepareWeeklyPlanPersistenceFields({
  grade: "6",
  sections: ["A", "B", "C"],
  section: "A",
  islamic_group: "B",
});
assert.equal(scope.sections_key, "A,B,C");
assert.deepEqual(scope.sections, ["A", "B", "C"]);

console.log(JSON.stringify({ ok: true, openAiCalls: 0 }, null, 2));
console.log("=== WEEKLY PLAN SAVE QA PASS ===");
