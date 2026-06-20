import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const text = readFileSync(resolve(__dirname, "../.env"), "utf8");
const env = {};
for (const line of text.split("\n")) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"\n]*)"?/);
  if (m) env[m[1]] = m[2];
}

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

const { data: auth } = await supabase.auth.signInWithPassword({
  email: "student-e2e-1719738562@example.com",
  password: "TestPass123!",
});

console.log("project", env.VITE_SUPABASE_PROJECT_ID);
console.log("user", auth.user?.id);

const { data: lessons } = await supabase
  .from("lessons")
  .select("id, quiz")
  .eq("published", true)
  .limit(200);

const withQuiz = (lessons ?? []).filter((l) => Array.isArray(l.quiz) && l.quiz.length > 0);
console.log("published lessons with quiz", withQuiz.length);

const { data: subs } = await supabase
  .from("lesson_quiz_submissions")
  .select("lesson_id, status, percentage, submitted_at")
  .eq("student_id", auth.user.id);

console.log("submissions", subs?.length ?? 0, subs);

const done = new Set((subs ?? []).map((s) => s.lesson_id));
const open = withQuiz.filter((l) => !done.has(l.id));
console.log("open quiz lessons", open.length, open.map((l) => l.id));

const essayLessonId = "2154336a-cbc1-42bb-9da5-654990c9f780";
const payload = [
  { questionIndex: 0, type: "multiple_choice", selectedIndex: 0 },
  { questionIndex: 1, type: "essay", essayText: "dup probe" },
];

const { error: dupRpc } = await supabase.rpc("submit_lesson_quiz", {
  p_lesson_id: essayLessonId,
  p_answers: payload,
});
console.log("duplicate rpc:", dupRpc ? `${dupRpc.code} ${dupRpc.message}` : "ALLOWED");

const { error: insDup } = await supabase.from("lesson_quiz_submissions").insert({
  student_id: auth.user.id,
  lesson_id: essayLessonId,
  score: 9999,
  auto_score: 9999,
  final_score: 9999,
  total_points: 10,
  percentage: 100,
  status: "reviewed",
  answers: [],
});
console.log("direct insert existing lesson:", insDup ? `${insDup.code} ${insDup.message}` : "ALLOWED");

const { data: subsAfter } = await supabase
  .from("lesson_quiz_submissions")
  .select("id, status, percentage, submitted_at")
  .eq("student_id", auth.user.id)
  .eq("lesson_id", essayLessonId);
console.log("rows for essay lesson after insert attempt", subsAfter?.length, subsAfter);

const lesson = open[0];
if (!lesson) {
  console.log("No open lesson for fresh RPC test");
  process.exit(0);
}

const { error: insErr } = await supabase.from("lesson_quiz_submissions").insert({
  student_id: auth.user.id,
  lesson_id: lesson.id,
  score: 9999,
  auto_score: 9999,
  final_score: 9999,
  total_points: 1,
  percentage: 100,
  status: "reviewed",
  answers: [],
});
console.log("direct insert open lesson:", insErr ? `${insErr.code} ${insErr.message}` : "ALLOWED");

const freshPayload = lesson.quiz.map((q, i) =>
  q.type === "essay"
    ? { questionIndex: i, type: "essay", essayText: "verify probe" }
    : {
        questionIndex: i,
        type: q.type === "true_false" ? "true_false" : "multiple_choice",
        selectedIndex: typeof q.answer === "number" ? q.answer : 0,
      },
);

const { data, error } = await supabase.rpc("submit_lesson_quiz", {
  p_lesson_id: lesson.id,
  p_answers: freshPayload,
});
console.log("rpc:", error ? `${error.code} ${error.message}` : "OK", data);
