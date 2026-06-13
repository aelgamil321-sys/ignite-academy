/**
 * Quiz integrity smoke tests against the linked Supabase project.
 * Requires migration 20260615120000_quiz_server_submit.sql applied.
 *
 * Usage: node scripts/test-quiz-integrity.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "../.env");
  const text = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?([^"\n]*)"?/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const studentEmail = process.env.TEST_STUDENT_EMAIL || "student-e2e-1719738562@example.com";
const studentPassword = process.env.TEST_STUDENT_PASSWORD || "TestPass123!";

if (!url || !key) {
  console.error("Missing Supabase URL or publishable key in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

function ok(label) {
  console.log(`PASS: ${label}`);
}

function fail(label, detail) {
  console.error(`FAIL: ${label}`, detail ?? "");
  process.exitCode = 1;
}

async function main() {
  console.log("Signing in as test student...");
  const { data: auth, error: signInError } = await supabase.auth.signInWithPassword({
    email: studentEmail,
    password: studentPassword,
  });
  if (signInError || !auth.user) {
    fail("student sign-in", signInError?.message);
    return;
  }
  ok("student sign-in");

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title, quiz, published")
    .eq("published", true)
    .limit(50);

  if (lessonsError) {
    fail("load lessons", lessonsError.message);
    return;
  }

  const withQuiz = (lessons ?? []).filter(
    (l) => Array.isArray(l.quiz) && l.quiz.length > 0,
  );

  if (withQuiz.length === 0) {
    fail("find lesson with quiz", "none published");
    return;
  }

  const mcqLesson = withQuiz.find((l) =>
    l.quiz.every((q) => q.type !== "essay"),
  );
  const essayLesson = withQuiz.find((l) =>
    l.quiz.some((q) => q.type === "essay"),
  );
  const tfLesson = withQuiz.find((l) =>
    l.quiz.some((q) => q.type === "true_false") &&
    !l.quiz.some((q) => q.type === "essay"),
  );

  async function submitViaRpc(lesson, label, buildAnswers) {
    const { data: existing } = await supabase
      .from("lesson_quiz_submissions")
      .select("id")
      .eq("student_id", auth.user.id)
      .eq("lesson_id", lesson.id)
      .maybeSingle();

    if (existing) {
      console.log(`SKIP: ${label} — already submitted for lesson ${lesson.id}`);
      return;
    }

    const payload = buildAnswers(lesson.quiz);
    const { data, error } = await supabase.rpc("submit_lesson_quiz", {
      p_lesson_id: lesson.id,
      p_answers: payload,
    });

    if (error) {
      fail(`${label} RPC submit`, error.message);
      return;
    }

    if (!data || typeof data.percentage !== "number") {
      fail(`${label} RPC response shape`, data);
      return;
    }

    ok(`${label} RPC submit — ${data.percentage}% status=${data.status}`);
  }

  if (mcqLesson) {
    await submitViaRpc(mcqLesson, "MCQ quiz", (quiz) =>
      quiz.map((q, i) => ({
        questionIndex: i,
        type: q.type === "true_false" ? "true_false" : "multiple_choice",
        selectedIndex: typeof q.answer === "number" ? q.answer : 0,
      })),
    );
  }

  if (tfLesson && tfLesson.id !== mcqLesson?.id) {
    await submitViaRpc(tfLesson, "True/false quiz", (quiz) =>
      quiz.map((q, i) => ({
        questionIndex: i,
        type: q.type === "essay" ? "essay" : q.type === "true_false" ? "true_false" : "multiple_choice",
        ...(q.type === "essay"
          ? { essayText: "Test essay answer for integrity check." }
          : { selectedIndex: typeof q.answer === "number" ? q.answer : 0 }),
      })),
    );
  }

  if (essayLesson) {
    await submitViaRpc(essayLesson, "Essay quiz", (quiz) =>
      quiz.map((q, i) =>
        q.type === "essay"
          ? {
              questionIndex: i,
              type: "essay",
              essayText: "Automated essay integrity test response.",
            }
          : {
              questionIndex: i,
              type: q.type === "true_false" ? "true_false" : "multiple_choice",
              selectedIndex: typeof q.answer === "number" ? q.answer : 0,
            },
      ),
    );

    const { data: essayRow } = await supabase
      .from("lesson_quiz_submissions")
      .select("status")
      .eq("student_id", auth.user.id)
      .eq("lesson_id", essayLesson.id)
      .maybeSingle();

    if (essayRow?.status === "pending_review") {
      ok("essay submission status pending_review");
    } else if (essayRow) {
      fail("essay pending review", `got status ${essayRow.status}`);
    }
  } else {
    console.log("SKIP: no published essay quiz lesson found");
  }

  const { error: forgedInsertError } = await supabase
    .from("lesson_quiz_submissions")
    .insert({
      student_id: auth.user.id,
      lesson_id: "00000000-0000-0000-0000-000000000099",
      score: 9999,
      auto_score: 9999,
      final_score: 9999,
      total_points: 1,
      percentage: 100,
      status: "reviewed",
      answers: [],
    });

  if (!forgedInsertError) {
    fail("direct insert should be blocked");
  } else {
    ok(`direct insert blocked (${forgedInsertError.code ?? forgedInsertError.message})`);
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
