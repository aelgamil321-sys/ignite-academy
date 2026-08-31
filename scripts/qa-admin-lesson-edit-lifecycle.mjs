/**
 * Simulate admin lesson edit controller lifecycle (load/publish/rerender) without OpenAI.
 * Restores published flag after publish/unpublish probe.
 * Run: node scripts/qa-admin-lesson-edit-lifecycle.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = {
  mainFile: "42810db6-1361-4bcb-8cee-22a04a05c25a",
  ai: "5313bac9-d1ed-413f-b2f8-34441fbe146a",
};

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    // optional
  }
}
loadEnvFile(join(root, ".env"));

const LANGS = ["ar", "en", "fr", "de", "ur", "zh"];
const MIN_EXPLANATION_CHARS = 10;

function parseLocalizedText(raw) {
  const out = Object.fromEntries(LANGS.map((l) => [l, ""]));
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const lang of LANGS) {
      if (raw[lang] !== undefined) out[lang] = String(raw[lang] ?? "");
    }
  } else if (typeof raw === "string") {
    try {
      return parseLocalizedText(JSON.parse(raw));
    } catch {
      out.en = raw;
    }
  }
  return out;
}

function parseVocabFromStorage(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object" && Array.isArray(raw.items)) return raw.items;
  return [];
}

function normalizeQuizList(raw) {
  return Array.isArray(raw) ? raw : [];
}

function normalizeLessonForEditForm(lesson) {
  return {
    ...lesson,
    unit: parseLocalizedText(lesson.unit),
    title: parseLocalizedText(lesson.title),
    outcome: parseLocalizedText(lesson.outcome),
    explanation: parseLocalizedText(lesson.explanation),
    vocab: parseVocabFromStorage(lesson.vocab),
    quiz: normalizeQuizList(lesson.quiz),
  };
}

function lessonFromRow(row) {
  return normalizeLessonForEditForm({
    id: String(row.id),
    grade: String(row.grade ?? ""),
    unit: row.unit,
    title: row.title,
    outcome: row.outcome,
    explanation: row.explanation,
    vocab: row.vocab,
    pptArUrl: row.ppt_ar_url ?? undefined,
    pptEnUrl: row.ppt_en_url ?? undefined,
    pdfArUrl: row.pdf_ar_url ?? undefined,
    pdfEnUrl: row.pdf_en_url ?? undefined,
    pptUrl: row.ppt_url ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
    quiz: row.quiz,
    published: Boolean(row.published),
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
  });
}

function hasMainLessonFile(lesson) {
  return Boolean(
    lesson.pdfArUrl || lesson.pdfEnUrl || lesson.pptArUrl || lesson.pptEnUrl || lesson.pptUrl || lesson.pdfUrl,
  );
}

function lessonHasSavedAiGeneratedContent(lesson) {
  const explanation = parseLocalizedText(lesson.explanation);
  const hasExplanation = LANGS.some((lang) => (explanation[lang]?.trim().length ?? 0) >= MIN_EXPLANATION_CHARS);
  const hasVocab = lesson.vocab.some((item) => {
    const word = parseLocalizedText(item?.word);
    return LANGS.some((lang) => Boolean(word[lang]?.trim()));
  });
  const hasQuiz = lesson.quiz.some((q) => {
    const parsed = parseLocalizedText(q?.q);
    return LANGS.some((lang) => Boolean(parsed[lang]?.trim()));
  });
  return hasExplanation && hasVocab && hasQuiz;
}

function resolveLessonEditFormMode(lesson) {
  try {
    if (lessonHasSavedAiGeneratedContent(lesson)) return "simplified";
  } catch {
    // safe fallback
  }
  return hasMainLessonFile(lesson) ? "simplified" : "full";
}

function handlePublishChange(lesson, nextPublished) {
  return lesson ? { ...lesson, published: nextPublished } : lesson;
}

function simulateLifecycle(row) {
  let lesson = lessonFromRow(row);
  const initialPublished = lesson.published;
  const initialMode = resolveLessonEditFormMode(lesson);
  assert.ok(lesson.title.en !== undefined);
  assert.ok(lesson.unit.en !== undefined);

  // publish toggle — local state only
  lesson = handlePublishChange(lesson, true);
  assert.equal(lesson.published, true);
  assert.equal(resolveLessonEditFormMode(lesson), initialMode);

  lesson = handlePublishChange(lesson, false);
  assert.equal(lesson.published, false);
  assert.equal(resolveLessonEditFormMode(lesson), initialMode);

  // restore
  lesson = handlePublishChange(lesson, initialPublished);
  assert.equal(lesson.published, initialPublished);
  return { id: lesson.id, mode: initialMode, published: initialPublished };
}

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && key, "missing supabase env");
const admin = createClient(url, key, { auth: { persistSession: false } });

const adminRoute = readFileSync(join(root, "src/routes/admin.lessons.edit.$lessonId.tsx"), "utf8");
const teacherRoute = readFileSync(join(root, "src/routes/teacher.lessons.edit.$lessonId.tsx"), "utf8");
assert.match(adminRoute, /useLessonEditController/);
assert.match(teacherRoute, /useLessonEditController/);
assert.match(adminRoute, /AdminLessonEditErrorBoundary/);
assert.doesNotMatch(adminRoute, /lessons\.find\(\(l\) => l\.id === lessonId\)/);

for (const [label, id] of Object.entries(FIXTURES)) {
  const { data, error } = await admin.from("lessons").select("*").eq("id", id).maybeSingle();
  assert.ok(!error && data, `fixture ${label} missing`);
  const originalPublished = Boolean(data.published);
  const result = simulateLifecycle(data);
  console.log(JSON.stringify({ fixture: label, ...result }));

  // DB publish probe with restore (no content mutation)
  const { error: pubErr } = await admin.from("lessons").update({ published: !originalPublished }).eq("id", id);
  assert.ok(!pubErr, pubErr?.message);
  const { data: afterPub } = await admin.from("lessons").select("published").eq("id", id).maybeSingle();
  assert.equal(Boolean(afterPub?.published), !originalPublished);

  const { error: restoreErr } = await admin.from("lessons").update({ published: originalPublished }).eq("id", id);
  assert.ok(!restoreErr, restoreErr?.message);
  const { data: restored } = await admin.from("lessons").select("published").eq("id", id).maybeSingle();
  assert.equal(Boolean(restored?.published), originalPublished);
  console.log(`fixture_${label}_publish_db_probe: restored`);
}

console.log("qa-admin-lesson-edit-lifecycle: all checks passed");
