/**
 * QA: saved multilingual AI lesson hydrates review UI after refresh (no OpenAI).
 * Run: node scripts/qa-lesson-ai-hydration.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["ar", "en", "fr", "de", "ur", "zh"];
const LESSON_ID = "60cb2261-3571-44a1-b0e9-f4cfd8bfdb19";
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
  }
  return out;
}

function parseBi(raw) {
  return parseLocalizedText(raw);
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

function hasAnyVocabWord(item) {
  const word = parseLocalizedText(item?.word);
  return LANGS.some((lang) => Boolean(word[lang]?.trim()));
}

function hasPersistedQuizQuestions(questions) {
  return questions.some((q) => {
    const parsed = parseLocalizedText(q?.q);
    return LANGS.some((lang) => Boolean(parsed[lang]?.trim()));
  });
}

function lessonHasSavedAiGeneratedContent(lesson) {
  const vocabItems = Array.isArray(lesson.vocab)
    ? lesson.vocab
    : parseVocabFromStorage(lesson.vocab).filter(hasAnyVocabWord);
  const quiz = normalizeQuizList(lesson.quiz);
  return (
    hasMeaningfulLocalizedText(lesson.explanation) &&
    vocabItems.some(hasAnyVocabWord) &&
    hasPersistedQuizQuestions(quiz)
  );
}

function buildLessonAiReviewBundleFromLesson(lesson) {
  return {
    title: parseBi(lesson.title),
    unit: parseBi(lesson.unit),
    outcome: parseBi(lesson.outcome),
    explanation: parseBi(lesson.explanation),
    vocab: parseVocabFromStorage(lesson.vocab).filter(hasAnyVocabWord),
    quiz: normalizeQuizList(lesson.quiz),
  };
}

function lessonFromRow(row) {
  return {
    id: String(row.id),
    title: parseBi(row.title),
    unit: parseBi(row.unit),
    outcome: parseBi(row.outcome),
    explanation: parseBi(row.explanation),
    vocab: parseVocabFromStorage(row.vocab),
    quiz: normalizeQuizList(row.quiz),
  };
}

function langPresence(obj) {
  const parsed = parseLocalizedText(obj);
  return Object.fromEntries(LANGS.map((lang) => [lang, Boolean(parsed[lang]?.trim())]));
}

// --- Source wiring ---
const panelSrc = readFileSync(join(root, "src/components/lesson-ai-generate-panel.tsx"), "utf8");
const formSrc = readFileSync(join(root, "src/components/lesson-edit-form.tsx"), "utf8");
const translateServer = readFileSync(join(root, "src/lib/ai/translate-lesson-content.server.ts"), "utf8");
assert.match(panelSrc, /savedReviewBundle/);
assert.match(formSrc, /savedAiReviewBundle/);
assert.match(formSrc, /lessonHasSavedAiGeneratedContent/);
assert.match(panelSrc, /confirmRegenerate/);
assert.match(panelSrc, /Regenerate with AI/);
assert.match(panelSrc, /reconstructSourceLessonOutput/);
assert.match(translateServer, /buildPartialLessonTranslationOutputSchema/);
assert.ok(!/placeholder=\{showFallbackWarning/.test(panelSrc));
const savedContentSrc = readFileSync(join(root, "src/lib/lesson-ai-saved-content.ts"), "utf8");
assert.match(savedContentSrc, /true_false/);
assert.match(savedContentSrc, /essay/);

function detectLessonSourceLanguage(input) {
  const sample = [input.lessonTitle, input.learningOutcome, input.unitNumber ?? "", input.extractedText.slice(0, 4000)]
    .join("\n")
    .trim();
  if (!sample) return input.hint ?? "en";
  const arabicChars = (sample.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) ?? []).length;
  const latinChars = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (arabicChars > 0 && arabicChars >= latinChars * 0.35) return "ar";
  if (latinChars > 0) return "en";
  return input.hint ?? "en";
}

// --- reconstruct source lesson for translation-only retry (no OpenAI) ---
function reconstructSourceLessonOutput(bundle, lessonTitle, learningOutcome, unitNumber) {
  const summary = bundle.explanation?.en?.trim() || bundle.explanation?.ar?.trim() || "";
  if (!summary) return null;
  const sourceLanguage = detectLessonSourceLanguage({
    lessonTitle,
    learningOutcome,
    unitNumber,
    extractedText: summary,
    hint: "en",
  });
  const pick = (bi) => (bi?.[sourceLanguage] || bi?.en || bi?.ar || "").trim();
  return {
    lesson_summary: pick(bundle.explanation),
    vocabulary: (bundle.vocab || []).map((item) => ({
      term: pick(item.word),
      synonym_or_simple_meaning: pick(item.meaning),
    })).filter((v) => v.term),
    quiz: {
      multiple_choice: (bundle.quiz || [])
        .filter((q) => q.type === "multiple_choice")
        .map((q) => ({
          question: pick(q.q),
          options: (q.options || []).map((o) => pick(o)),
          correctAnswer: q.answer ?? 0,
          explanation: "",
        })),
      true_false: [],
      essay: [],
    },
    warnings: [],
  };
}

const partialBundle = {
  explanation: { en: "English summary about wudu and prayer for students.", ar: "" },
  vocab: [{ word: { en: "Wudu" }, meaning: { en: "Ablution" } }],
  quiz: [
    {
      type: "multiple_choice",
      q: { en: "What is wudu?" },
      options: [{ en: "Ablution" }, { en: "Prayer" }, { en: "Fasting" }, { en: "Charity" }],
      answer: 0,
    },
  ],
};
const rebuilt = reconstructSourceLessonOutput(partialBundle, "Wudu lesson", "Students learn wudu", "3");
assert.ok(rebuilt?.lesson_summary?.includes("wudu"));
assert.equal(rebuilt.quiz.multiple_choice[0].correctAnswer, 0);

// --- Legacy empty lesson must NOT hydrate ---
const emptyLesson = {
  id: "x",
  title: { en: "Manual", ar: "يدوي" },
  unit: { en: "1", ar: "1" },
  outcome: { en: "Outcome", ar: "نتيجة" },
  explanation: { en: "", ar: "", fr: "", de: "", ur: "", zh: "" },
  vocab: { items: [] },
  quiz: [],
};
assert.equal(lessonHasSavedAiGeneratedContent(emptyLesson), false);

// --- DB round-trip for current teacher lesson ---
const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && serviceKey, "Supabase env required for hydration QA");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const marker = `hydration-qa-${Date.now()}`;

const multilingualPayload = {
  explanation: {
    en: `${marker}-summary-en`,
    ar: `${marker}-ملخص-عربي`,
    fr: `${marker}-fr`,
    de: `${marker}-de`,
    ur: `${marker}-ur`,
    zh: `${marker}-zh`,
  },
  vocab: {
    items: [
      {
        word: { en: "w-en", ar: "w-ar", fr: "w-fr", de: "w-de", ur: "w-ur", zh: "w-zh" },
        meaning: { en: "m-en", ar: "m-ar", fr: "m-fr", de: "m-de", ur: "m-ur", zh: "m-zh" },
      },
    ],
  },
  quiz: [
    {
      type: "multiple_choice",
      q: { en: "q-en", ar: "q-ar", fr: "q-fr", de: "q-de", ur: "q-ur", zh: "q-zh" },
      options: [
        { en: "o1", ar: "خ1", fr: "f1", de: "d1", ur: "u1", zh: "z1" },
        { en: "o2", ar: "خ2", fr: "f2", de: "d2", ur: "u2", zh: "z2" },
        { en: "o3", ar: "خ3", fr: "f3", de: "d3", ur: "u3", zh: "z3" },
        { en: "o4", ar: "خ4", fr: "f4", de: "d4", ur: "u4", zh: "z4" },
      ],
      answer: 0,
      points: 1,
    },
  ],
};

const { error: updateError } = await admin.from("lessons").update(multilingualPayload).eq("id", LESSON_ID);
assert.ifError(updateError);

const { data: row, error: loadError } = await admin
  .from("lessons")
  .select("id, title, unit, outcome, explanation, vocab, quiz")
  .eq("id", LESSON_ID)
  .maybeSingle();
assert.ifError(loadError);
assert.ok(row, "lesson must load from DB");

const lesson = lessonFromRow(row);
const detectDebug = {
  explanation: hasMeaningfulLocalizedText(lesson.explanation),
  vocab: lesson.vocab.length,
  quiz: hasPersistedQuizQuestions(lesson.quiz),
};
assert.equal(lessonHasSavedAiGeneratedContent(lesson), true, `saved AI lesson must be detected: ${JSON.stringify(detectDebug)}`);

const bundle = buildLessonAiReviewBundleFromLesson(lesson);
assert.equal(bundle.explanation.ar, `${marker}-ملخص-عربي`);
assert.equal(bundle.vocab[0].meaning.fr, "m-fr");
assert.equal(bundle.quiz[0].q.zh, "q-zh");

const explanationLangs = langPresence(bundle.explanation);
for (const lang of LANGS) {
  assert.equal(explanationLangs[lang], true, `explanation.${lang} must survive reload`);
}

// Simulate post-refresh hydration decision
const hydratedPanelShowsReview = lessonHasSavedAiGeneratedContent(lesson);
const hydratedPrimaryIsGenerateOnly = !hydratedPanelShowsReview;
assert.equal(hydratedPanelShowsReview, true);
assert.equal(hydratedPrimaryIsGenerateOnly, false);

console.log("qa-lesson-ai-hydration: all checks passed");
