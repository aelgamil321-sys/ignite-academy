/**
 * Simulate admin lesson edit initial render path for real lesson rows (no OpenAI).
 * Run: node scripts/qa-admin-lesson-edit-load.mjs [lessonId]
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const singleId = process.argv[2];

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
  if (Array.isArray(raw)) return raw.map(normalizeVocabItem).filter(hasVocabWord);
  if (typeof raw === "object" && Array.isArray(raw.items)) {
    return raw.items.map(normalizeVocabItem).filter(hasVocabWord);
  }
  if (typeof raw === "object" && ("en" in raw || "ar" in raw)) {
    return [];
  }
  return [];
}

function normalizeVocabItem(raw) {
  if (!raw || typeof raw !== "object") return { word: parseLocalizedText(null), meaning: parseLocalizedText(null) };
  const o = raw;
  return {
    word: parseLocalizedText(o.word ?? o.term),
    meaning: parseLocalizedText(o.meaning ?? o.def),
  };
}

function hasVocabWord(item) {
  const word = parseLocalizedText(item.word);
  return LANGS.some((lang) => Boolean(word[lang]?.trim()));
}

function normalizeQuizList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((q) => {
    const o = q && typeof q === "object" ? q : {};
    const type = o.type === "true_false" ? "true_false" : o.type === "essay" ? "essay" : "multiple_choice";
    const options = Array.isArray(o.options) ? o.options.map((opt) => parseLocalizedText(opt)) : [];
    return {
      type,
      q: parseLocalizedText(o.q),
      options,
      answer: typeof o.answer === "number" ? o.answer : 0,
      points: typeof o.points === "number" ? o.points : 1,
      modelAnswer: o.modelAnswer ? parseLocalizedText(o.modelAnswer) : undefined,
    };
  });
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
    youtubeUrl: String(row.youtube_url ?? ""),
    youtubeArUrl: row.youtube_url_ar ? String(row.youtube_url_ar) : undefined,
    youtubeEnUrl: row.youtube_url_en ? String(row.youtube_url_en) : undefined,
    pdfUrl: row.pdf_url ? String(row.pdf_url) : undefined,
    pptUrl: row.ppt_url ? String(row.ppt_url) : undefined,
    pptArUrl: row.ppt_ar_url ? String(row.ppt_ar_url) : undefined,
    pptEnUrl: row.ppt_en_url ? String(row.ppt_en_url) : undefined,
    pdfArUrl: row.pdf_ar_url ? String(row.pdf_ar_url) : undefined,
    pdfEnUrl: row.pdf_en_url ? String(row.pdf_en_url) : undefined,
    quiz: row.quiz,
    subjectCategory: row.subject_category ?? "quran",
    published: Boolean(row.published),
    createdAt: new Date(String(row.created_at)).getTime(),
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
  });
}

function bilingualFilesFromLesson(lesson) {
  return {
    pptArUrl: lesson.pptArUrl ?? null,
    pptEnUrl: lesson.pptEnUrl ?? null,
    pdfArUrl: lesson.pdfArUrl ?? null,
    pdfEnUrl: lesson.pdfEnUrl ?? null,
    worksheetArUrl: lesson.worksheetArUrl ?? null,
    worksheetEnUrl: lesson.worksheetEnUrl ?? null,
  };
}

function hasMainLessonFile(files, lesson) {
  return Boolean(
    files.pptArUrl || files.pptEnUrl || files.pdfArUrl || files.pdfEnUrl || lesson.pptUrl || lesson.pdfUrl,
  );
}

function lessonHasSavedAiGeneratedContent(lesson) {
  const explanation = parseLocalizedText(lesson.explanation);
  const hasExplanation = LANGS.some((lang) => (explanation[lang]?.trim().length ?? 0) >= MIN_EXPLANATION_CHARS);
  const hasVocab = lesson.vocab.some((item) => {
    const word = parseLocalizedText(item.word);
    return LANGS.some((lang) => Boolean(word[lang]?.trim()));
  });
  const hasQuiz = lesson.quiz.some((q) => {
    const parsed = parseLocalizedText(q.q);
    return LANGS.some((lang) => Boolean(parsed[lang]?.trim()));
  });
  return hasExplanation && hasVocab && hasQuiz;
}

function buildLessonAiReviewBundleFromLesson(lesson) {
  return {
    title: parseLocalizedText(lesson.title),
    unit: parseLocalizedText(lesson.unit),
    outcome: parseLocalizedText(lesson.outcome),
    explanation: parseLocalizedText(lesson.explanation),
    vocab: lesson.vocab,
    quiz: lesson.quiz,
  };
}

function simulateLessonEditFormInit(lesson) {
  const unit = parseLocalizedText(lesson.unit);
  const title = parseLocalizedText(lesson.title);
  const outcome = parseLocalizedText(lesson.outcome);
  const explanation = parseLocalizedText(lesson.explanation);
  assert.equal(typeof unit.en, "string");
  assert.equal(typeof title.en, "string");
  assert.equal(typeof outcome.en, "string");
  assert.equal(typeof explanation.en, "string");
  const files = bilingualFilesFromLesson(lesson);
  const simplified =
    lessonHasSavedAiGeneratedContent(lesson) || hasMainLessonFile(files, lesson) ? "simplified" : "full";
  const bundle = lessonHasSavedAiGeneratedContent(lesson)
    ? buildLessonAiReviewBundleFromLesson(lesson)
    : null;
  return { simplified, hasBundle: Boolean(bundle), pub: lesson.published };
}

function classifyLesson(row) {
  const lesson = lessonFromRow(row);
  const files = bilingualFilesFromLesson(lesson);
  const ai = lessonHasSavedAiGeneratedContent(lesson);
  const main = hasMainLessonFile(files, lesson);
  const legacy = !ai && !main;
  const draft = !lesson.published;
  const published = lesson.published;
  return { lesson, ai, legacy, draft, published, main };
}

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && key, "missing supabase env");
const admin = createClient(url, key, { auth: { persistSession: false } });

const query = admin.from("lessons").select("*").order("created_at", { ascending: false }).limit(singleId ? 1 : 50);
const { data, error } = singleId ? await query.eq("id", singleId) : await query;
assert.ok(!error, error?.message);
assert.ok(data?.length, "no lessons found");

const failures = [];
const buckets = { ai: null, legacy: null, draft: null, published: null };

for (const row of data) {
  try {
    const lesson = lessonFromRow(row);
    const result = simulateLessonEditFormInit(lesson);
    const tags = classifyLesson(row);
    if (tags.ai && !buckets.ai) buckets.ai = lesson.id;
    if (tags.legacy && !buckets.legacy) buckets.legacy = lesson.id;
    if (tags.draft && !buckets.draft) buckets.draft = lesson.id;
    if (tags.published && !buckets.published) buckets.published = lesson.id;
    console.log(
      JSON.stringify({
        id: lesson.id,
        published: lesson.published,
        mode: result.simplified,
        hasBundle: result.hasBundle,
        grade: lesson.grade,
      }),
    );
  } catch (e) {
    failures.push({ id: row.id, error: e instanceof Error ? e.message : String(e) });
  }
}

if (failures.length) {
  console.error("FAILURES", JSON.stringify(failures, null, 2));
  process.exit(1);
}

const adminEdit = readFileSync(join(root, "src/routes/admin.lessons.edit.$lessonId.tsx"), "utf8");
const teacherEdit = readFileSync(join(root, "src/routes/teacher.lessons.edit.$lessonId.tsx"), "utf8");
const lessonEditForm = readFileSync(join(root, "src/components/lesson-edit-form.tsx"), "utf8");
const lessonEditSafe = readFileSync(join(root, "src/lib/lesson-edit-safe.ts"), "utf8");
const lessonEditRow = readFileSync(join(root, "src/lib/lesson-edit-row.ts"), "utf8");
const lessonEditController = readFileSync(join(root, "src/hooks/use-lesson-edit-controller.ts"), "utf8");

assert.doesNotMatch(adminEdit, /lessons\.find\(\(l\) => l\.id === lessonId\)/);
assert.match(adminEdit, /useLessonEditController/);
assert.match(teacherEdit, /useLessonEditController/);
assert.match(lessonEditRow, /lessonFromRow/);
assert.match(lessonEditController, /handlePublishChange/);
assert.match(lessonEditSafe, /normalizeLessonForEditForm/);
assert.match(lessonEditForm, /biForLessonForm/);
assert.match(lessonEditForm, /saved AI review bundle hydrate failed/);
assert.doesNotMatch(
  lessonEditForm,
  /useEffect\([\s\S]*localizedSnapshotRef[\s\S]*\},\s*\[lesson\.id\]\);[\s\S]*const localizedSnapshotRef = useRef/,
  "localizedSnapshotRef must be declared before effects that write to it",
);

const pinned = {
  ai: "5313bac9-d1ed-413f-b2f8-34441fbe146a",
  legacyMainOnly: "42810db6-1361-4bcb-8cee-22a04a05c25a",
};

for (const [label, id] of Object.entries(pinned)) {
  const row = data.find((r) => r.id === id) ?? (await admin.from("lessons").select("*").eq("id", id).maybeSingle()).data;
  assert.ok(row, `pinned lesson missing: ${label} ${id}`);
  simulateLessonEditFormInit(lessonFromRow(row));
  console.log(`pinned_${label}: PASS ${id}`);
}

console.log("bucket_coverage", JSON.stringify(buckets));
console.log("qa-admin-lesson-edit-load: all checks passed");
