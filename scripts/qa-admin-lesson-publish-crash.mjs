/**
 * QA: admin publish must not flip form mode or drop AI bundle on CMS resync (no OpenAI).
 * Run: node scripts/qa-admin-lesson-publish-crash.mjs [lessonId]
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lessonId = process.argv[2] ?? "60cb2261-3571-44a1-b0e9-f4cfd8bfdb19";
const LANGS = ["ar", "en", "fr", "de", "ur", "zh"];
const MIN_EXPLANATION_CHARS = 10;

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    // optional
  }
}
loadEnvFile(join(root, ".env"));

function parseLocalizedText(raw) {
  const out = Object.fromEntries(LANGS.map((l) => [l, ""]));
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const lang of LANGS) {
      if (raw[lang] !== undefined) out[lang] = String(raw[lang] ?? "");
    }
    if (raw.en !== undefined) out.en = String(raw.en ?? "");
    if (raw.ar !== undefined) out.ar = String(raw.ar ?? "");
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

function hasMeaningfulLocalizedText(text) {
  const parsed = parseLocalizedText(text);
  return LANGS.some((lang) => (parsed[lang]?.trim().length ?? 0) >= MIN_EXPLANATION_CHARS);
}

function lessonHasSavedAiGeneratedContent(lesson) {
  const hasExplanation = hasMeaningfulLocalizedText(lesson.explanation);
  const hasVocab = lesson.vocab.some((item) => {
    const word = parseLocalizedText(item.word);
    return LANGS.some((lang) => Boolean(word[lang]?.trim()));
  });
  const hasQuiz = normalizeQuizList(lesson.quiz).some((q) => {
    const parsed = parseLocalizedText(q.q);
    return LANGS.some((lang) => Boolean(parsed[lang]?.trim()));
  });
  return hasExplanation && hasVocab && hasQuiz;
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

function adminParseBi(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { en: String(raw.en ?? ""), ar: String(raw.ar ?? "") };
  }
  return { en: "", ar: "" };
}

function adminLessonFromRow(row) {
  return {
    id: String(row.id),
    grade: String(row.grade ?? ""),
    unit: adminParseBi(row.unit),
    title: adminParseBi(row.title),
    outcome: adminParseBi(row.outcome),
    explanation: adminParseBi(row.explanation),
    vocab: parseVocabFromStorage(row.vocab),
    pptArUrl: row.ppt_ar_url ? String(row.ppt_ar_url) : undefined,
    pptEnUrl: row.ppt_en_url ? String(row.ppt_en_url) : undefined,
    pdfArUrl: row.pdf_ar_url ? String(row.pdf_ar_url) : undefined,
    pdfEnUrl: row.pdf_en_url ? String(row.pdf_en_url) : undefined,
    pptUrl: row.ppt_url ? String(row.ppt_url) : undefined,
    pdfUrl: row.pdf_url ? String(row.pdf_url) : undefined,
    quiz: normalizeQuizList(row.quiz),
    published: Boolean(row.published),
  };
}

function cmsLessonFromRow(row) {
  return {
    id: String(row.id),
    grade: String(row.grade ?? ""),
    unit: parseLocalizedText(row.unit),
    title: parseLocalizedText(row.title),
    outcome: parseLocalizedText(row.outcome),
    explanation: parseLocalizedText(row.explanation),
    vocab: parseVocabFromStorage(row.vocab),
    pptArUrl: row.ppt_ar_url ?? undefined,
    pptEnUrl: row.ppt_en_url ?? undefined,
    pdfArUrl: row.pdf_ar_url ?? undefined,
    pdfEnUrl: row.pdf_en_url ?? undefined,
    pptUrl: row.ppt_url ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
    quiz: normalizeQuizList(row.quiz),
    published: Boolean(row.published),
  };
}

function formMode(lesson) {
  return lessonHasSavedAiGeneratedContent(lesson) ||
    hasMainLessonFile(bilingualFilesFromLesson(lesson), lesson)
    ? "simplified"
    : "full";
}

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (url && key) {
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await admin.from("lessons").select("*").eq("id", lessonId).maybeSingle();
  if (!error && data) {
    const beforeAdmin = adminLessonFromRow(data);
    const afterCms = cmsLessonFromRow({ ...data, published: true });
    const beforeMode = formMode(beforeAdmin);
    const afterMode = formMode(afterCms);
    const beforeBundle = lessonHasSavedAiGeneratedContent(beforeAdmin);
    const afterBundle = lessonHasSavedAiGeneratedContent(afterCms);
    console.log(
      JSON.stringify(
        {
          lessonId,
          publishedInDb: data.published,
          beforeMode,
          afterPublishResyncMode: afterMode,
          beforeBundle,
          afterBundle,
        },
        null,
        2,
      ),
    );
    assert.equal(afterMode, beforeMode, "publish resync must not flip form mode");
    assert.equal(afterBundle, beforeBundle, "publish resync must not drop AI review bundle");
  }
}

const adminEdit = readFileSync(join(root, "src/routes/admin.lessons.edit.$lessonId.tsx"), "utf8");
const lessonEditController = readFileSync(join(root, "src/hooks/use-lesson-edit-controller.ts"), "utf8");
assert.doesNotMatch(
  adminEdit,
  /lessons\.find\(\(l\) => l\.id === lessonId\)/,
  "admin edit must not resync lesson from CMS lessons array after publish",
);
assert.match(adminEdit, /useLessonEditController/);
assert.match(adminEdit, /onPublishChange=\{handlePublishChange\}/);
assert.match(lessonEditController, /handlePublishChange/);
assert.match(lessonEditController, /\[lessonId, retryKey/);
assert.doesNotMatch(adminEdit, /\[lessonId, lessons/);

const lessonEditForm = readFileSync(join(root, "src/components/lesson-edit-form.tsx"), "utf8");
assert.match(lessonEditForm, /onPublishChange\?:/);
assert.match(lessonEditForm, /\[lesson\.id, lesson\.published\]/);
assert.match(lessonEditForm, /\[lesson\.id\]/);
assert.match(lessonEditForm, /biForLessonForm/);

const publishBtn = readFileSync(join(root, "src/components/teacher-lesson-publish-button.tsx"), "utf8");
assert.match(publishBtn, /setConfirmOpen\(false\);\s*\n\s*onUpdated\?\.\(true\)/);

console.log("qa-admin-lesson-publish-crash: all checks passed");
