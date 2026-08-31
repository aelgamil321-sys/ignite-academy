/**
 * Non-paid regression checks for lesson upload path contract + edit init safety.
 * Run: node scripts/qa-lesson-upload-edit.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const LESSON_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseLessonUuid(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return LESSON_UUID_RE.test(trimmed) ? trimmed.toLowerCase() : null;
}

function parseLessonIdFromStoragePath(path) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts[0] === "lessons" && parts.length >= 2) {
    return parseLessonUuid(parts[1]);
  }
  return parseLessonUuid(parts[0]);
}

function lessonStoragePathOwnedByLesson(path, lessonId) {
  const pathLessonId = parseLessonIdFromStoragePath(path);
  const expected = parseLessonUuid(lessonId);
  return pathLessonId !== null && expected !== null && pathLessonId === expected;
}

function buildLessonStorageKey(lessonId, originalFileName) {
  const safeLessonId = parseLessonUuid(lessonId);
  if (!safeLessonId) {
    throw new Error(`Invalid lesson ID for storage upload: ${String(lessonId)}`);
  }
  const safeName = (originalFileName.split(/[/\\]/).pop() ?? originalFileName)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 180)
    .toLowerCase() || "file";
  return `${safeLessonId}/${Date.now()}-${safeName}`;
}

function resolveMainLessonFile(files, lesson, lang = "en") {
  const langFirst =
    lang === "ar"
      ? ["pptArUrl", "pdfArUrl", "pptEnUrl", "pdfEnUrl"]
      : ["pptEnUrl", "pdfEnUrl", "pptArUrl", "pdfArUrl"];
  for (const key of langFirst) {
    const url = files[key]?.trim();
    if (url) return { kind: "bilingual", key, url };
  }
  const ppt = lesson?.pptUrl?.trim();
  if (ppt) return { kind: "legacy-ppt", url: ppt };
  const pdf = lesson?.pdfUrl?.trim();
  if (pdf) return { kind: "legacy-pdf", url: pdf };
  return null;
}

function prepareTeacherEditLesson(row) {
  const LANGS = ["ar", "en", "fr", "de", "ur", "zh"];
  const parseBi = (raw) => {
    const out = { ar: "", en: "", fr: "", de: "", ur: "", zh: "" };
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const lang of LANGS) {
        if (raw[lang] !== undefined) out[lang] = String(raw[lang] ?? "");
      }
    }
    return out;
  };
  return {
    id: String(row.id),
    grade: String(row.grade ?? ""),
    unit: parseBi(row.unit),
    title: parseBi(row.title),
    outcome: parseBi(row.outcome),
    explanation: parseBi(row.explanation),
    vocab: Array.isArray(row.vocab?.items) ? row.vocab.items : [],
    pptArUrl: row.ppt_ar_url ?? null,
    pptEnUrl: row.ppt_en_url ?? null,
    pdfArUrl: row.pdf_ar_url ?? null,
    pdfEnUrl: row.pdf_en_url ?? null,
    pptUrl: row.ppt_url ?? null,
    pdfUrl: row.pdf_url ?? null,
    quiz: Array.isArray(row.quiz) ? row.quiz : [],
    published: Boolean(row.published),
  };
}

// --- Upload path contract ---
const lessonId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

assert.throws(
  () => buildLessonStorageKey("lessons", "holiest-mosques.pptx"),
  /Invalid lesson ID/,
  "literal 'lessons' must never become a storage path segment",
);

const key = buildLessonStorageKey(lessonId, "holiest-mosques.pptx");
assert.ok(!key.startsWith("lessons/"), `storage key must not use lessons/ prefix: ${key}`);
assert.equal(parseLessonIdFromStoragePath(key), lessonId.toLowerCase());
assert.equal(parseLessonIdFromStoragePath(`lessons/${lessonId}/old.pdf`), lessonId.toLowerCase());
assert.ok(lessonStoragePathOwnedByLesson(key, lessonId));
assert.ok(!lessonStoragePathOwnedByLesson("lessons/not-a-uuid/x.pdf", lessonId));

const uploadTs = readFileSync(join(root, "src/lib/upload.ts"), "utf8");
assert.match(
  uploadTs,
  /parseLessonUuid\(lessonId\)/,
  "uploadLessonFile must validate lessonId before storage upload",
);

const createTs = readFileSync(join(root, "src/components/lesson-create-draft-form.tsx"), "utf8");
assert.match(createTs, /parseLessonUuid\(data\.id\)/, "create flow must validate draft id from insert");
assert.match(createTs, /uploadLessonFile\(file,\s*safeLessonId\)/, "create upload must pass validated UUID");

const teacherCreateRoute = readFileSync(join(root, "src/routes/teacher/lessons.new.tsx"), "utf8");
assert.match(teacherCreateRoute, /LessonCreateDraftForm/, "teacher create route must use shared draft form");

// --- Edit init: missing main file must not throw ---
const emptyFiles = {
  pptArUrl: null,
  pptEnUrl: null,
  pdfArUrl: null,
  pdfEnUrl: null,
};
const draftRow = {
  id: lessonId,
  grade: "5",
  unit: { en: "3", ar: "3" },
  title: { en: "Holiest Mosques", ar: "" },
  outcome: { en: "Students will learn about mosques.", ar: "" },
  explanation: { en: "", ar: "" },
  vocab: { items: [] },
  quiz: [],
  published: false,
  ppt_ar_url: null,
  ppt_en_url: null,
  pdf_ar_url: null,
  pdf_en_url: null,
  ppt_url: null,
  pdf_url: null,
};
const prepared = prepareTeacherEditLesson(draftRow);
assert.equal(resolveMainLessonFile(emptyFiles, prepared, "en"), null);
assert.equal(prepared.title.en, "Holiest Mosques");
assert.equal(prepared.vocab.length, 0);

// Legacy AR/EN
const legacy = prepareTeacherEditLesson({
  ...draftRow,
  ppt_url: "https://example.com/storage/v1/object/public/lesson-files/legacy-id/old.pptx",
  ppt_name: "old.pptx",
});
assert.equal(resolveMainLessonFile(emptyFiles, legacy, "en")?.kind, "legacy-ppt");

// Six-language shape (extra keys must not crash parse)
const multilingual = prepareTeacherEditLesson({
  ...draftRow,
  title: { en: "EN", ar: "AR", fr: "FR", de: "DE", ur: "UR", zh: "ZH" },
  outcome: { en: "o", ar: "ع", fr: "f", de: "d", ur: "u", zh: "z" },
});
assert.equal(multilingual.title.en, "EN");
assert.equal(multilingual.title.ar, "AR");
assert.equal(multilingual.title.fr, "FR");
assert.equal(multilingual.title.zh, "ZH");

const editRouteTs = readFileSync(join(root, "src/routes/teacher.lessons.edit.$lessonId.tsx"), "utf8");
assert.ok(
  /return parseLocalizedText\(raw\)/.test(editRouteTs),
  "teacher edit parseBi must return full localized text",
);
assert.ok(
  !/if \(loading\) return/.test(editRouteTs),
  "teacher edit must not gate lesson fetch on CMS loading",
);
assert.ok(
  /INIT_TIMEOUT_MS/.test(editRouteTs) && /timedOut/.test(editRouteTs),
  "teacher edit must include init timeout fail-safe",
);
assert.ok(
  /scopePhase/.test(editRouteTs) && /lessonPhase/.test(editRouteTs),
  "teacher edit must use explicit async phases",
);
assert.ok(
  /useCallback\(async \(\) => \{[\s\S]*setLoading\(false\)/.test(
    readFileSync(join(root, "src/lib/cms.tsx"), "utf8"),
  ),
  "CMS refresh must be memoized with useCallback",
);
const panelTs = readFileSync(join(root, "src/components/lesson-ai-generate-panel.tsx"), "utf8");
assert.ok(
  !/\{L\([^)]+\)\}(?!\[)/.test(panelTs),
  "lesson-ai-generate-panel must not render L() without [lang] (object-as-child crash)",
);

console.log("qa-lesson-upload-edit: all checks passed");
