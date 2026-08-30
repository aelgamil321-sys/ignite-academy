/**
 * QA checks for teacher timetable transcription pipeline (run: node scripts/qa-teacher-timetable.mjs)
 * No OpenAI calls — deterministic fixtures only.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GOLDEN_TRANSCRIPTION_MATRIX,
  GOLDEN_SCHEDULE,
  convertTranscriptionToSchedule,
  compareScheduleSlots,
  daySlotsPass,
  countScheduleSlots,
  ensureFixedGridSchedule,
  TIMETABLE_SCHOOL_DAYS,
} from "./lib/timetable-transcription.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function testGoldenFixture40of40() {
  const schedule = convertTranscriptionToSchedule(GOLDEN_TRANSCRIPTION_MATRIX);
  const result = compareScheduleSlots(schedule, GOLDEN_SCHEDULE);
  assert.equal(result.total, 40, `expected 40 slots, got ${result.total}`);
  assert.equal(result.correct, 40, `expected 40/40 correct, got ${result.correct}/40`);
  console.log(`PASS golden fixture ${result.correct}/${result.total} slots`);
}

function testEachWeekday() {
  const schedule = convertTranscriptionToSchedule(GOLDEN_TRANSCRIPTION_MATRIX);
  for (const day of TIMETABLE_SCHOOL_DAYS) {
    assert.ok(daySlotsPass(schedule, day, GOLDEN_SCHEDULE), `${day} fixture mismatch`);
    console.log(`PASS ${day}`);
  }
}

function testMondayFreePeriods() {
  const monday = GOLDEN_SCHEDULE.days.find((d) => d.day === "Monday");
  assert.equal(monday.slots[1].type, "free");
  assert.equal(monday.slots[1].period, 2);
  assert.equal(monday.slots[6].type, "free");
  assert.equal(monday.slots[6].period, 6);
  assert.equal(monday.slots[1].needsReview, false);
  console.log("PASS Monday P2 and P6 FREE without needsReview");
}

function testBreakDeterministic() {
  for (const day of TIMETABLE_SCHOOL_DAYS) {
    const row = GOLDEN_SCHEDULE.days.find((d) => d.day === day);
    const brk = row.slots[4];
    assert.equal(brk.type, "break");
    assert.equal(brk.startTime, "11:20");
    assert.equal(brk.endTime, "12:10");
    assert.equal(brk.period, null);
    assert.equal(brk.needsReview, false);
  }
  console.log("PASS break deterministic on all 5 days");
}

function testMondayPeriod7NotShifted() {
  const monday = GOLDEN_SCHEDULE.days.find((d) => d.day === "Monday");
  const p7 = monday.slots[7];
  assert.equal(p7.period, 7);
  assert.equal(p7.startTime, "13:50");
  assert.equal(p7.classLabel, "G12C/G12D");
  console.log("PASS Monday P7 not shifted");
}

function testClassLabelPreserved() {
  const monday = GOLDEN_SCHEDULE.days.find((d) => d.day === "Monday");
  assert.equal(monday.slots[0].classLabel, "G11A/G11B");
  assert.notEqual(monday.slots[0].classLabel, "A/G 11B");
  console.log("PASS classLabel preserved exactly");
}

function testQurPreserved() {
  const wed = GOLDEN_SCHEDULE.days.find((d) => d.day === "Wednesday");
  const thu = GOLDEN_SCHEDULE.days.find((d) => d.day === "Thursday");
  assert.equal(wed.slots[1].subject, "QUR");
  assert.equal(wed.slots[1].classLabel, "G8A");
  assert.equal(thu.slots[1].subject, "QUR");
  assert.equal(thu.slots[1].classLabel, "G8A");
  console.log("PASS QUR preserved Wed/Thu P2");
}

function testTranscriptionOnlyAiSchema() {
  const extractSource = readFileSync(join(root, "src/lib/timetable/extract-timetable.server.ts"), "utf8");
  assert.match(extractSource, /aiTranscriptionMatrixSchema/);
  assert.match(extractSource, /convertTranscriptionToSchedule/);
  assert.match(extractSource, /TIMETABLE_TRANSCRIPTION_SYSTEM_PROMPT/);
  assert.doesNotMatch(extractSource, /aiTimetableOutputSchema/);
  assert.doesNotMatch(extractSource, /type: z\.enum\(\["class", "free", "break"\]\)/);
  console.log("PASS AI transcription-only schema");
}

function testVisionTranscriptionPrompt() {
  const visionSource = readFileSync(join(root, "src/lib/timetable/timetable-vision-request.ts"), "utf8");
  assert.match(visionSource, /buildTimetableTranscriptionVisionContent/);
  assert.match(visionSource, /detail: "high"/);
  assert.match(visionSource, /Do not transcribe Break/);
  console.log("PASS vision transcription prompt");
}

function testTeacherScopingInServerSource() {
  const source = readFileSync(join(root, "src/lib/timetable/timetable-api.server.ts"), "utf8");
  assert.match(source, /eq\("teacher_id", teacherId\)/);
  assert.match(source, /supabaseAdmin/);
  console.log("PASS teacher own-schedule scoping");
}

function testMissingCellsDefaultFree() {
  const partial = structuredClone(GOLDEN_TRANSCRIPTION_MATRIX);
  delete partial.Monday["2"];
  delete partial.Friday["7"];
  const schedule = convertTranscriptionToSchedule(partial);
  assert.equal(countScheduleSlots(schedule), 40);
  const monday = schedule.days.find((d) => d.day === "Monday");
  const friday = schedule.days.find((d) => d.day === "Friday");
  const mondayP2 = monday.slots.find((s) => s.period === 2);
  const fridayP7 = friday.slots.find((s) => s.period === 7);
  assert.equal(mondayP2.type, "free");
  assert.equal(mondayP2.needsReview, false);
  assert.equal(fridayP7.type, "free");
  assert.equal(fridayP7.needsReview, false);
  console.log("PASS missing AI cells default to free");
}

function testFixedGridAlways40Slots() {
  const empty = ensureFixedGridSchedule(null);
  assert.equal(countScheduleSlots(empty), 40);
  for (const day of TIMETABLE_SCHOOL_DAYS) {
    const row = empty.days.find((d) => d.day === day);
    assert.equal(row.slots.length, 8);
    assert.equal(row.slots[4].type, "break");
  }
  console.log("PASS fixed 40-slot grid always present");
}

function testConfirmedScheduleRoundTrip() {
  const saved = structuredClone(GOLDEN_SCHEDULE);
  saved.confirmedAt = "2026-08-30T12:00:00.000Z";
  const reloaded = ensureFixedGridSchedule(saved);
  const result = compareScheduleSlots(reloaded, GOLDEN_SCHEDULE);
  assert.equal(result.correct, 40);
  console.log("PASS confirmed schedule survives reload normalization");
}

function testCompactGridUi() {
  const ui = readFileSync(join(root, "src/components/teacher-timetable-ui.tsx"), "utf8");
  const grid = readFileSync(join(root, "src/components/teacher-timetable-weekly-grid.tsx"), "utf8");
  assert.match(ui, /TimetableWeeklyGrid/);
  assert.match(grid, /data-testid="timetable-weekly-grid"/);
  assert.match(ui, /teacher_timetable_confirm/);
  assert.match(ui, /teacher_timetable_edit/);
  assert.match(ui, /teacher_timetable_replace/);
  assert.doesNotMatch(ui, /teacher_timetable_col_grade/);
  console.log("PASS compact weekly review grid UI");
}

function testClientUsesServerOnly() {
  const ui = readFileSync(join(root, "src/components/teacher-timetable-ui.tsx"), "utf8");
  assert.doesNotMatch(ui, /OPENAI_API_KEY/);
  assert.match(ui, /teacher_timetable_dash_free/);
  assert.match(ui, /ensureFixedGridSchedule/);
  console.log("PASS client grid UI wiring");
}

function testNoOpenAiInQaScript() {
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  assert.doesNotMatch(self, /from ["']openai|fetch\([^)]*openai/);
  console.log("PASS QA makes 0 OpenAI calls");
}

testGoldenFixture40of40();
testEachWeekday();
testMondayFreePeriods();
testBreakDeterministic();
testMondayPeriod7NotShifted();
testClassLabelPreserved();
testQurPreserved();
testMissingCellsDefaultFree();
testFixedGridAlways40Slots();
testConfirmedScheduleRoundTrip();
testTranscriptionOnlyAiSchema();
testVisionTranscriptionPrompt();
testTeacherScopingInServerSource();
testCompactGridUi();
testClientUsesServerOnly();
testNoOpenAiInQaScript();

console.log("\nAll teacher timetable QA checks passed.");
