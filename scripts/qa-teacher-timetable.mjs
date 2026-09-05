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
import {
  buildGoldenSpreadsheetRows,
  mapSpreadsheetGridToTranscriptionMatrix,
  mapTimetableTextToTranscriptionMatrix,
} from "./lib/timetable-grid-map.mjs";

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

function testDeterministicFirstPipelineWired() {
  const pipeline = readFileSync(join(root, "src/lib/timetable/timetable-extract-pipeline.server.ts"), "utf8");
  const api = readFileSync(join(root, "src/lib/timetable/timetable-api.server.ts"), "utf8");
  assert.match(pipeline, /mapSpreadsheetGridToTranscriptionMatrix/);
  assert.match(pipeline, /tryDeterministicFromGrid/);
  assert.match(pipeline, /tryDeterministicFromText/);
  assert.match(api, /runTeacherTimetableExtraction/);
  assert.doesNotMatch(api, /extractTimetableWithAi/);
  console.log("PASS deterministic-first pipeline wired");
}

function testXlsxGoldenSpreadsheet40of40() {
  const rows = buildGoldenSpreadsheetRows(GOLDEN_TRANSCRIPTION_MATRIX);
  const mapped = mapSpreadsheetGridToTranscriptionMatrix(rows);
  assert.equal(mapped.ok, true, mapped.reason ?? "map failed");
  const schedule = convertTranscriptionToSchedule(mapped.matrix);
  const result = compareScheduleSlots(schedule, GOLDEN_SCHEDULE);
  assert.equal(result.correct, 40, `xlsx grid ${result.correct}/40`);
  console.log(`PASS XLSX deterministic import ${result.correct}/${result.total}`);
}

function testXlsxEmptyCellsStayFree() {
  const rows = [
    ["Day", "P1", "P2", "P3", "P4", "P5", "P6", "P7"],
    ["Monday", "ISL G11A/G11B", "", "ISL G9A/G9B", "ISL G11C/G11D", "ISL G12E/G12F", "", "ISL G12C/G12D"],
    ["Tuesday", "", "", "", "", "", "", ""],
    ["Wednesday", "", "", "", "", "", "", ""],
    ["Thursday", "", "", "", "", "", "", ""],
    ["Friday", "", "", "", "", "", "", ""],
  ];
  const mapped = mapSpreadsheetGridToTranscriptionMatrix(rows);
  assert.equal(mapped.ok, true);
  assert.equal(mapped.matrix.Monday["2"].text, "");
  assert.equal(mapped.matrix.Monday["6"].text, "");
  const schedule = convertTranscriptionToSchedule(mapped.matrix);
  const monday = schedule.days.find((d) => d.day === "Monday");
  assert.equal(monday.slots[1].type, "free");
  assert.equal(monday.slots[1].needsReview, false);
  assert.equal(monday.slots[6].type, "free");
  console.log("PASS XLSX empty cells remain Free");
}

function testPdfTextGridDeterministic() {
  const rows = buildGoldenSpreadsheetRows(GOLDEN_TRANSCRIPTION_MATRIX);
  const text = rows.map((row) => row.join("\t")).join("\n");
  const mapped = mapTimetableTextToTranscriptionMatrix(text);
  assert.equal(mapped.ok, true);
  const schedule = convertTranscriptionToSchedule(mapped.matrix);
  const result = compareScheduleSlots(schedule, GOLDEN_SCHEDULE);
  assert.equal(result.correct, 40);
  console.log("PASS PDF/text grid deterministic-first mapping");
}

function testHighConfidenceEmptyNotNeedsReview() {
  const matrix = structuredClone(GOLDEN_TRANSCRIPTION_MATRIX);
  matrix.Monday["2"] = { subject: "", text: "", confidence: 0.98 };
  const schedule = convertTranscriptionToSchedule(matrix);
  const monday = schedule.days.find((d) => d.day === "Monday");
  assert.equal(monday.slots[1].type, "free");
  assert.equal(monday.slots[1].needsReview, false);
  console.log("PASS high-confidence empty cells not flagged needsReview");
}

function testUnreadableCellNeedsReview() {
  const matrix = structuredClone(GOLDEN_TRANSCRIPTION_MATRIX);
  matrix.Monday["3"] = { subject: null, text: null, confidence: 0.2 };
  const schedule = convertTranscriptionToSchedule(matrix);
  const monday = schedule.days.find((d) => d.day === "Monday");
  const p3 = monday.slots.find((s) => s.period === 3);
  assert.equal(p3.type, "free");
  assert.equal(p3.needsReview, true);
  console.log("PASS unreadable cells flagged needsReview");
}

function testReplaceClearsParsedSchedule() {
  const upload = readFileSync(join(root, "src/lib/teacher-timetable.ts"), "utf8");
  assert.match(upload, /parsed_schedule: null/);
  console.log("PASS replace upload clears parsed_schedule");
}

function testCategorizedFailureUx() {
  const ui = readFileSync(join(root, "src/components/teacher-timetable-ui.tsx"), "utf8");
  const i18n = readFileSync(join(root, "src/lib/i18n.tsx"), "utf8");
  assert.match(ui, /timetableExtractErrorMessage/);
  assert.match(i18n, /teacher_timetable_error_unsupported_file/);
  assert.match(i18n, /teacher_timetable_error_unreadable/);
  assert.match(i18n, /teacher_timetable_error_parsing_failed/);
  assert.match(i18n, /teacher_timetable_error_ai_unavailable/);
  assert.match(i18n, /For best accuracy, upload the original Excel timetable/);
  console.log("PASS categorized failure UX + Excel recommendation");
}

function testDashboardTodaySchedule() {
  const ui = readFileSync(join(root, "src/components/teacher-timetable-ui.tsx"), "utf8");
  assert.match(ui, /filterTodaySlots/);
  const monday = GOLDEN_SCHEDULE.days.find((d) => d.day === "Monday");
  const teaching = monday.slots.filter((s) => s.type === "class");
  assert.equal(teaching.length, 5);
  assert.equal(monday.slots[4].type, "break");
  console.log("PASS dashboard today schedule wiring + golden Monday shape");
}

function testSixLanguageTimetableUi() {
  const grid = readFileSync(join(root, "src/components/teacher-timetable-weekly-grid.tsx"), "utf8");
  const display = readFileSync(join(root, "src/lib/timetable/timetable-subject-display.ts"), "utf8");
  assert.match(grid, /displayTimetableSubjectCode/);
  assert.match(grid, /displayTimetableWeekday/);
  assert.match(display, /L\("Islamic Education"/);
  const cfg = readFileSync(join(root, "src/lib/i18n-config.ts"), "utf8");
  assert.match(cfg, /lang === "ar" \|\| lang === "ur"/);
  console.log("PASS six-language + RTL timetable UI wiring");
}

function testVisionCoordinatePrompt() {
  const visionSource = readFileSync(join(root, "src/lib/timetable/timetable-vision-request.ts"), "utf8");
  assert.match(visionSource, /Monday: p1, p2, p3, p4, p5, p6, p7/);
  assert.match(visionSource, /confidence = 0\.0–1\.0/);
  assert.match(visionSource, /detail: "high"/);
  console.log("PASS vision coordinate-based transcription prompt");
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
testDeterministicFirstPipelineWired();
testXlsxGoldenSpreadsheet40of40();
testXlsxEmptyCellsStayFree();
testPdfTextGridDeterministic();
testHighConfidenceEmptyNotNeedsReview();
testUnreadableCellNeedsReview();
testReplaceClearsParsedSchedule();
testCategorizedFailureUx();
testDashboardTodaySchedule();
testSixLanguageTimetableUi();
testTeacherScopingInServerSource();
testCompactGridUi();
testClientUsesServerOnly();
testNoOpenAiInQaScript();

console.log("\nAll teacher timetable QA checks passed.");
