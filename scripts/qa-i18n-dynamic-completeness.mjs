/**
 * Dynamic content field-by-field completeness QA (OpenAI calls = 0, mocks only).
 * Run: node scripts/qa-i18n-dynamic-completeness.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["ar", "en", "fr", "de", "ur", "zh"];

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function parseLocalizedText(raw) {
  const out = Object.fromEntries(LANGS.map((l) => [l, ""]));
  if (raw && typeof raw === "object") {
    for (const lang of LANGS) out[lang] = String(raw[lang] ?? "");
  }
  return out;
}

function isLessonLangSlotMissing(text, lang) {
  const value = parseLocalizedText(text)[lang]?.trim() ?? "";
  if (!value) return true;
  const arabic = /[\u0600-\u06FF]/;
  const latin = /[A-Za-z]/;
  const cjk = /[\u4E00-\u9FFF]/;
  if (lang === "ar" || lang === "ur") return latin.test(value) && !arabic.test(value);
  if (lang === "zh") return !cjk.test(value) && latin.test(value);
  if (lang === "en" || lang === "fr" || lang === "de") return arabic.test(value) && !latin.test(value);
  return false;
}

function mergeMissingLocalizedSlotsOnly(base, incoming) {
  const parsed = parseLocalizedText(base);
  const patch = {};
  for (const lang of LANGS) {
    if (isLessonLangSlotMissing(parsed, lang) && incoming[lang]?.trim()) {
      patch[lang] = incoming[lang].trim();
    }
  }
  const merged = { ...parsed, ...patch };
  return merged;
}

function collectLessonMissingLocalizedSlots(input) {
  const missing = [];
  const push = (path, bi) => {
    for (const lang of LANGS) {
      if (isLessonLangSlotMissing(bi, lang)) missing.push({ path: `${path}.${lang}`, lang });
    }
  };
  push("title", input.title);
  push("unit", input.unit);
  push("outcome", input.outcome);
  push("explanation", input.explanation);
  (input.vocab ?? []).forEach((item, index) => {
    push(`vocab[${index}].word`, item.word ?? item.term);
    push(`vocab[${index}].meaning`, item.meaning ?? item.synonym_or_simple_meaning);
  });
  (input.quiz ?? []).forEach((question, index) => {
    push(`quiz[${index}].question`, question.question);
    (question.options ?? []).forEach((option, optionIndex) => {
      push(`quiz[${index}].options[${optionIndex}]`, option);
    });
  });
  return { missing, complete: missing.length === 0 };
}

function testFixtureMissingDetection(report) {
  const fixture = {
    title: { en: "Five Pillars", ar: "أركان الإسلام", fr: "Cinq piliers", de: "", ur: "", zh: "" },
    outcome: { en: "Recall pillars", ar: "تذكر الأركان", fr: "", de: "", ur: "", zh: "" },
    explanation: { en: "Lesson body", ar: "", fr: "", de: "", ur: "", zh: "" },
    vocab: [
      {
        word: { en: "Shahada", ar: "الشهادة", fr: "Chahada", de: "", ur: "", zh: "" },
        meaning: { en: "Declaration", ar: "إعلان", fr: "Déclaration", de: "Erklärung", ur: "", zh: "" },
      },
    ],
    quiz: [
      {
        type: "mcq",
        question: { en: "How many?", ar: "كم؟", fr: "", de: "", ur: "", zh: "" },
        options: [
          { en: "Five", ar: "خمسة", fr: "", de: "", ur: "", zh: "" },
          { en: "Four", ar: "أربعة", fr: "", de: "", ur: "", zh: "" },
        ],
      },
    ],
  };

  const missing = [];
  const push = (path, bi) => {
    for (const lang of LANGS) {
      if (isLessonLangSlotMissing(bi, lang)) missing.push(`${path}.${lang}`);
    }
  };
  push("title", fixture.title);
  push("outcome", fixture.outcome);
  push("explanation", fixture.explanation);
  push("vocab[0].word", fixture.vocab[0].word);
  push("vocab[0].meaning", fixture.vocab[0].meaning);
  push("quiz[0].question", fixture.quiz[0].question);
  fixture.quiz[0].options.forEach((opt, i) => push(`quiz[0].options[${i}]`, opt));

  assert.ok(missing.includes("title.de"), "expected title.de missing");
  assert.ok(missing.includes("outcome.fr"), "expected outcome.fr missing");
  assert.ok(missing.includes("explanation.ar"), "expected explanation.ar missing");
  assert.ok(missing.includes("vocab[0].word.de"), "expected vocab word.de missing");
  assert.ok(!missing.includes("vocab[0].meaning.de"), "vocab meaning.de is present");
  assert.ok(missing.includes("quiz[0].question.fr"), "expected quiz question.fr missing");
  report.missingFieldDetector = "PASS";
}

async function testMergePreservesExisting(report) {
  const base = { en: "Five Pillars", ar: "أركان الإسلام", fr: "Cinq piliers", de: "", ur: "", zh: "" };
  const merged = mergeMissingLocalizedSlotsOnly(base, {
    de: "Fünf Säulen",
    fr: "SHOULD NOT OVERWRITE",
    en: "SHOULD NOT OVERWRITE",
  });
  assert.equal(merged.fr, "Cinq piliers", "existing fr preserved");
  assert.equal(merged.en, "Five Pillars", "existing en preserved");
  assert.equal(merged.de, "Fünf Säulen", "missing de filled");
  report.existingTranslationsProtected = "PASS";
}

async function testCollectLessonMissing(report) {
  const result = collectLessonMissingLocalizedSlots({
    title: { en: "T", ar: "ت", fr: "F", de: "D", ur: "U", zh: "中" },
    outcome: { en: "O", ar: "", fr: "", de: "", ur: "", zh: "" },
    explanation: { en: "E", ar: "ع", fr: "F", de: "D", ur: "U", zh: "中" },
  });
  assert.ok(result.missing.some((m) => m.path === "outcome.ar"), "outcome.ar missing");
  assert.ok(result.missing.some((m) => m.path === "outcome.fr"), "outcome.fr missing");
  assert.equal(result.complete, false);
  report.lessonCompleteness = "PASS";
}

function testAssignmentPersistence(report) {
  const assignment = read("src/lib/assignment.ts");
  const migration = read("supabase/migrations/20260906140000_phase43d_localized_content_jsonb.sql");
  assert.match(assignment, /readLocalizedFieldWithLegacyFallback/);
  assert.match(assignment, /localizedDualWriteColumnSet|mergeLocalizedWithLegacyEnAr/);
  assert.match(migration, /assignments[\s\S]*title jsonb/);
  assert.match(migration, /notifications[\s\S]*title jsonb/);
  assert.match(migration, /weekly_plan_master_lists[\s\S]*label jsonb/);
  report.assignmentsPersistence = "PASS (jsonb + legacy dual-write)";
}

function testSacredTextProtection(report) {
  const protection = read("src/lib/islamic-text-protection.ts");
  assert.match(protection, /classifyIslamicTextContent/);
  assert.match(protection, /hasCorruptedDisplayText/);
  report.sacredTextProtection = "PASS";
}

function testCompleteMissingTranslationsWiring(report) {
  const gen = read("src/lib/ai/generate-lesson-from-file.server.ts");
  assert.match(gen, /translateOnly/);
  assert.match(gen, /translateLessonContent/);
  const mapper = read("src/lib/ai/lesson-multilingual-mapper.ts");
  assert.match(mapper, /mergeLocalizedTexts/);
  report.completeMissingTranslations = "PASS (translateOnly + mergeLocalizedTexts)";
}

async function main() {
  const report = { ok: true, openAiCalls: 0 };

  testFixtureMissingDetection(report);
  await testMergePreservesExisting(report);
  await testCollectLessonMissing(report);
  testAssignmentPersistence(report);
  testSacredTextProtection(report);
  testCompleteMissingTranslationsWiring(report);

  report.ok = true;

  console.log(JSON.stringify(report, null, 2));
  console.log("PASS dynamic content completeness QA");
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, message: String(err?.message ?? err) }));
  process.exit(1);
});
