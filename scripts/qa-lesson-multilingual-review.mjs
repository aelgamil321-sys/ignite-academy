/**
 * Multilingual AI review regression checks.
 * Run: node scripts/qa-lesson-multilingual-review.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const LANGS = ["ar", "en", "fr", "de", "ur", "zh"];

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvFile(join(root, ".env"));

// --- Inline mirrors of lesson-localized + lesson-multilingual-resolve ---
function emptyLocalizedText() {
  return { ar: "", en: "", fr: "", de: "", ur: "", zh: "" };
}

function parseLocalizedText(raw) {
  const out = emptyLocalizedText();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const lang of LANGS) {
      if (raw[lang] !== undefined) out[lang] = String(raw[lang] ?? "");
    }
  }
  return out;
}

function serializeLocalizedText(text) {
  const out = emptyLocalizedText();
  for (const lang of LANGS) {
    out[lang] = String(text[lang] ?? "").trim();
  }
  return out;
}

const FALLBACK_ORDER = ["en", "ar", "fr", "de", "ur", "zh"];

function resolveLessonLangText(text, lang) {
  const parsed = parseLocalizedText(text);
  const direct = parsed[lang]?.trim();
  if (direct) return { value: direct, usedFallback: false };
  for (const fallback of FALLBACK_ORDER) {
    if (fallback === lang) continue;
    const candidate = parsed[fallback]?.trim();
    if (candidate) return { value: candidate, usedFallback: true, fallbackLang: fallback };
  }
  return { value: "", usedFallback: false };
}

function arabicTabShowsEnglishWhileArabicExists(text, displayedValue) {
  const parsed = parseLocalizedText(text);
  const ar = parsed.ar?.trim();
  if (!ar) return false;
  const en = parsed.en?.trim();
  if (!en) return false;
  return displayedValue.trim() === en && displayedValue.trim() !== ar;
}

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_SCRIPT_RE = /[A-Za-z]/;

function containsArabicScript(text) {
  return ARABIC_SCRIPT_RE.test(text);
}
function containsLatinScript(text) {
  return LATIN_SCRIPT_RE.test(text);
}
function readLessonLangSlot(text, lang) {
  return parseLocalizedText(text)[lang]?.trim() ?? "";
}
function isLessonLangSlotMissing(text, lang) {
  const value = readLessonLangSlot(text, lang);
  if (!value) return true;
  if (lang === "ar" || lang === "ur") {
    return containsLatinScript(value) && !containsArabicScript(value);
  }
  if (lang === "en" || lang === "fr" || lang === "de") {
    return containsArabicScript(value) && !containsLatinScript(value);
  }
  return false;
}
function displayLessonLangForTab(text, lang) {
  return isLessonLangSlotMissing(text, lang) ? "" : readLessonLangSlot(text, lang);
}

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

function mapSummarySlots(sourceLanguage, sourceSummary, translatedAr, translatedEn) {
  const slots = { ar: "", en: "", fr: "", de: "", ur: "", zh: "" };
  slots[sourceLanguage] = sourceSummary;
  if (sourceLanguage === "en" && translatedAr) slots.ar = translatedAr;
  if (sourceLanguage === "ar" && translatedEn) slots.en = translatedEn;
  return slots;
}

function isQaFixtureLessonFields(title, outcome) {
  const titleParsed = parseLocalizedText(title);
  const outcomeParsed = parseLocalizedText(outcome);
  const titleHit = FALLBACK_ORDER.some((lang) => /^Create flow QA \d+$/.test((titleParsed[lang] ?? "").trim()));
  const outcomeHit = FALLBACK_ORDER.some((lang) => (outcomeParsed[lang] ?? "").trim() === "Outcome");
  return titleHit && outcomeHit;
}

function hasAnyLocalizedText(text) {
  const parsed = parseLocalizedText(text);
  return LANGS.some((lang) => Boolean(parsed[lang]?.trim()));
}

function serializeBiForSave(text) {
  return serializeLocalizedText(parseLocalizedText(text));
}

function serializeQuizForSave(questions) {
  return questions
    .filter((q) => hasAnyLocalizedText(q.q))
    .map((q) => ({
      q: serializeBiForSave(q.q),
      type: q.type,
      options: (q.options ?? []).map(serializeBiForSave),
      answer: q.answer,
      points: q.points ?? 1,
      ...(q.modelAnswer ? { modelAnswer: serializeBiForSave(q.modelAnswer) } : {}),
    }));
}

function validateMcqIndexConsistency(questions) {
  const issues = [];
  for (const [i, q] of questions.entries()) {
    if (q.type !== "multiple_choice") continue;
    if (q.answer < 0 || q.answer > 3) issues.push(`q${i}: bad index ${q.answer}`);
    for (const lang of LANGS) {
      const opts = (q.options ?? []).filter((opt) => parseLocalizedText(opt)[lang]?.trim());
      if (opts.length > 0 && opts.length < (q.options ?? []).length) {
        issues.push(`q${i}: partial MCQ options for ${lang}`);
      }
    }
  }
  return issues;
}

// --- A. Arabic tab must read .ar only; never render English fixture when ar exists ---
const bilingualSummary = {
  en: "English lesson summary about wudu.",
  ar: "ملخص عربي عن الوضوء.",
  fr: "Résumé français.",
  de: "Deutsche Zusammenfassung.",
  ur: "اردو خلاصہ",
  zh: "中文摘要",
};
const arDisplayed = displayLessonLangForTab(bilingualSummary, "ar");
assert.equal(arDisplayed, bilingualSummary.ar);
assert.equal(
  arabicTabShowsEnglishWhileArabicExists(bilingualSummary, arDisplayed),
  false,
  "Arabic tab must not render English when ar exists",
);
assert.equal(displayLessonLangForTab(bilingualSummary, "en"), bilingualSummary.en);

const englishInArSlot = {
  en: "English lesson summary about wudu.",
  ar: "English lesson summary about wudu.",
};
assert.ok(isLessonLangSlotMissing(englishInArSlot, "ar"), "Latin-only ar slot must be treated as missing Arabic");
assert.equal(displayLessonLangForTab(englishInArSlot, "ar"), "");
assert.equal(readLessonLangSlot(englishInArSlot, "ar"), englishInArSlot.ar);

// --- B. Wrong sourceLanguage mapping regression (Arabic UI + English source) ---
const enSource =
  "This lesson covers the holiest mosques in Islam and their historical significance for students.";
const arTranslation = "يغطي هذا الدرس أقدس المساجد في الإسلام وأهميتها التاريخية للطلاب.";
assert.equal(
  detectLessonSourceLanguage({
    lessonTitle: "اا",
    learningOutcome: "ارا",
    extractedText: enSource,
    hint: "ar",
  }),
  "en",
);
const wrongSlots = mapSummarySlots("ar", enSource, arTranslation, enSource);
assert.equal(wrongSlots.ar, enSource, "bug repro: ar slot gets English source");
assert.ok(isLessonLangSlotMissing(wrongSlots, "ar"));
const rightSlots = mapSummarySlots("en", enSource, arTranslation, enSource);
assert.equal(rightSlots.ar, arTranslation);
assert.match(displayLessonLangForTab(rightSlots, "ar"), /[\u0600-\u06FF]/);

// --- C. Missing translation must not silently render English in Arabic tab ---
const enOnly = { en: "English only", ar: "", fr: "", de: "", ur: "", zh: "" };
assert.equal(displayLessonLangForTab(enOnly, "ar"), "");
assert.ok(isLessonLangSlotMissing(enOnly, "ar"));

// --- C. Quiz serialize must preserve six languages ---
const quizIn = [
  {
    type: "multiple_choice",
    q: { en: "Q EN", ar: "س EN", fr: "Q FR", de: "Q DE", ur: "Q UR", zh: "Q ZH" },
    options: [
      { en: "A", ar: "أ", fr: "F", de: "D", ur: "U", zh: "Z" },
      { en: "B", ar: "ب", fr: "F2", de: "D2", ur: "U2", zh: "Z2" },
      { en: "C", ar: "ج", fr: "F3", de: "D3", ur: "U3", zh: "Z3" },
      { en: "D", ar: "د", fr: "F4", de: "D4", ur: "U4", zh: "Z4" },
    ],
    answer: 2,
    points: 1,
  },
  {
    type: "essay",
    q: { en: "Essay EN", ar: "مقال", fr: "FR", de: "DE", ur: "UR", zh: "ZH" },
    options: [],
    answer: 0,
    points: 5,
    modelAnswer: { en: "Model EN", ar: "نموذج", fr: "MF", de: "MD", ur: "MU", zh: "MZ" },
  },
];
const quizOut = serializeQuizForSave(quizIn);
assert.equal(quizOut[0].options[2].fr, "F3");
assert.equal(quizOut[0].answer, 2);
assert.equal(quizOut[1].modelAnswer.zh, "MZ");
assert.equal(validateMcqIndexConsistency(quizOut).length, 0);

// --- D. QA fixture detection ---
assert.ok(
  isQaFixtureLessonFields(
    { en: "Create flow QA 1788104054221", ar: "Create flow QA 1788104054221" },
    { en: "Outcome", ar: "Outcome" },
  ),
);
assert.ok(
  !isQaFixtureLessonFields(
    { en: "Holiest Mosques", ar: "أقدس المساجد" },
    { en: "Students learn about mosques.", ar: "يتعلم الطلاب عن المساجد." },
  ),
);

// --- E. Runtime source must not import QA scripts ---
const panelSrc = readFileSync(join(root, "src/components/lesson-ai-generate-panel.tsx"), "utf8");
const reviewSrc = readFileSync(join(root, "src/components/lesson-ai-multilingual-review.tsx"), "utf8");
const formSrc = readFileSync(join(root, "src/components/lesson-edit-form.tsx"), "utf8");
assert.ok(!/qa-lesson-create-flow|Create flow QA/.test(panelSrc));
assert.ok(!/qa-lesson-create-flow|Create flow QA/.test(reviewSrc));
assert.ok(!/qa-lesson-create-flow|Create flow QA/.test(formSrc));
assert.match(reviewSrc, /readLessonLangSlot/);
assert.match(reviewSrc, /isLessonLangSlotMissing/);
assert.ok(!/placeholder=\{showFallbackWarning/.test(reviewSrc), "review must not use English placeholder fallback");

const serverTs = readFileSync(join(root, "src/lib/ai/generate-lesson-from-file.server.ts"), "utf8");
assert.ok(
  !/sourceLanguage = input\.sourceLanguage \?\? detectLessonSourceLanguage/.test(serverTs),
  "translate step must detect source language from content, not UI locale",
);
assert.match(reviewSrc, /Vocabulary/);
assert.match(reviewSrc, /modelAnswer/);
assert.match(reviewSrc, /isQaFixtureLessonFields/);

const editRouteSrc = readFileSync(join(root, "src/routes/teacher.lessons.edit.$lessonId.tsx"), "utf8");
assert.ok(
  !/return \{ en: localized\.en, ar: localized\.ar \}/.test(editRouteSrc),
  "teacher edit parseBi must preserve all six languages",
);

const quizTs = readFileSync(join(root, "src/lib/lesson-quiz.ts"), "utf8");
assert.match(quizTs, /serializeLocalizedText/);
assert.ok(!/en: q\.q\.en\.trim\(\), ar: q\.q\.ar\.trim\(\)/.test(quizTs), "quiz save must not strip fr/de/ur/zh");

// --- F. Save/reload round-trip (service role) ---
const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (url && serviceKey) {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const lessonId = "60cb2261-3571-44a1-b0e9-f4cfd8bfdb19";
  const marker = `ml-review-qa-${Date.now()}`;

  const payload = {
    explanation: {
      en: `${marker}-en`,
      ar: `${marker}-ar`,
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
    quiz: serializeQuizForSave([
      {
        type: "multiple_choice",
        q: { en: "q-en", ar: "q-ar", fr: "q-fr", de: "q-de", ur: "q-ur", zh: "q-zh" },
        options: [
          { en: "o1", ar: "خ1", fr: "f1", de: "d1", ur: "u1", zh: "z1" },
          { en: "o2", ar: "خ2", fr: "f2", de: "d2", ur: "u2", zh: "z2" },
          { en: "o3", ar: "خ3", fr: "f3", de: "d3", ur: "u3", zh: "z3" },
          { en: "o4", ar: "خ4", fr: "f4", de: "d4", ur: "u4", zh: "z4" },
        ],
        answer: 1,
        points: 1,
      },
    ]),
  };

  const { error: updateError } = await admin.from("lessons").update(payload).eq("id", lessonId);
  assert.ifError(updateError);

  const { data: reloaded, error: reloadError } = await admin
    .from("lessons")
    .select("explanation, vocab, quiz")
    .eq("id", lessonId)
    .maybeSingle();
  assert.ifError(reloadError);
  assert.ok(reloaded, "lesson must reload");

  assert.equal(reloaded.explanation.ar, `${marker}-ar`);
  assert.equal(reloaded.explanation.fr, `${marker}-fr`);
  assert.equal(reloaded.explanation.zh, `${marker}-zh`);
  assert.equal(reloaded.vocab.items[0].meaning.fr, "m-fr");
  assert.equal(reloaded.quiz[0].q.zh, "q-zh");
  assert.equal(reloaded.quiz[0].options[1].de, "d2");
  assert.equal(reloaded.quiz[0].answer, 1);

  console.log("save/reload: six-language fields preserved");
} else {
  console.log("save/reload: skipped (missing Supabase env)");
}

console.log("qa-lesson-multilingual-review: all checks passed");
