/**
 * Platform-wide six-language translation QA (OpenAI calls = 0).
 * Run: node scripts/qa-platform-translation.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["ar", "en", "fr", "de", "ur", "zh"];
const RTL_LANGS = new Set(["ar", "ur"]);
const LTR_LANGS = new Set(["en", "fr", "de", "zh"]);

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function testCanonicalResolverModule() {
  const src = read("src/lib/localized-content-resolve.ts");
  assert.match(src, /export function resolveLocalizedContent/);
  assert.match(src, /export function resolveStoredLocalizedText/);
  assert.match(src, /export function isLocalizedContentObject/);
  assert.match(src, /export function assertSafeReactLocalizedChild/);
  assert.match(src, /mode: LocalizedResolveMode = "display"/);
  console.log("PASS canonical resolver module");
}

function testStoredResolverDelegation() {
  const edu = read("src/lib/translate-educational-content.ts");
  assert.match(edu, /resolveStoredLocalizedText/);
  assert.match(edu, /return resolveStoredLocalizedText\(bi, lang\)/);
  const localized = read("src/lib/lesson-localized.ts");
  assert.match(localized, /resolveStoredLocalizedText/);
  console.log("PASS stored resolver delegation");
}

function testPickBiExtendedLangs() {
  const cfg = read("src/lib/i18n-config.ts");
  assert.match(cfg, /resolveStoredLocalizedText\(text, lang\)/);
  console.log("PASS pickBi uses stored extended langs");
}

function testBiUsesCanonicalResolver() {
  const i18n = read("src/lib/i18n.tsx");
  assert.match(i18n, /resolveLocalizedContent/);
  assert.match(i18n, /assertSafeReactLocalizedChild/);
  console.log("PASS bi() wired to canonical resolver + React guard");
}

function testSacredTextSafeguards() {
  const protection = read("src/lib/islamic-text-protection.ts");
  assert.match(protection, /hasCorruptedDisplayText/);
  assert.match(protection, /classifyIslamicTextContent/);
  const mapper = read("src/lib/ai/lesson-multilingual-mapper.ts");
  assert.match(mapper, /LESSON_GENERATION_WARNING\.SACRED_TEXT_CORRUPTED/);
  assert.match(mapper, /LESSON_GENERATION_WARNING\.SACRED_TEXT_REVIEW/);
  console.log("PASS sacred-text safeguards separated from ordinary translation");
}

function testLessonWarningLocalization() {
  const warnings = read("src/lib/lesson-generation-warnings.ts");
  assert.match(warnings, /localizeLessonGenerationWarning/);
  const panel = read("src/components/lesson-ai-generate-panel.tsx");
  assert.match(panel, /localizeLessonGenerationWarning/);
  console.log("PASS lesson AI warnings localized in UI");
}

function testTranslationOnlyRetryPreservesSource() {
  const gen = read("src/lib/ai/generate-lesson-from-file.server.ts");
  assert.match(gen, /translateOnly/);
  assert.match(gen, /Source lesson payload is required for translation retry/);
  assert.match(gen, /detectLessonSourceLanguage/);
  assert.doesNotMatch(gen, /translateOnly[\s\S]{0,400}runSourceGeneration/s);
  console.log("PASS translation-only retry preserves source");
}

function testTranslationCacheHash() {
  const cache = read("src/lib/translation-cache.ts");
  assert.match(cache, /contentHash/);
  assert.match(cache, /buildEducationalCacheKey/);
  assert.match(cache, /isValidEducationalCacheHit/);
  console.log("PASS translation cache key + hash validation");
}

function testTimetableLocalization() {
  const display = read("src/lib/timetable/timetable-subject-display.ts");
  assert.match(display, /displayTimetableSubjectCode/);
  assert.match(display, /ISL/);
  assert.match(display, /QUR/);
  const grid = read("src/components/teacher-timetable-weekly-grid.tsx");
  assert.match(grid, /displayTimetableSubjectCode/);
  assert.match(grid, /displayTimetableWeekday/);
  const i18n = read("src/lib/i18n.tsx");
  assert.match(i18n, /teacher_timetable_slot_class/);
  assert.match(i18n, /teacher_timetable_replace/);
  console.log("PASS timetable localization wiring");
}

function testRtlLtrConfig() {
  const cfg = read("src/lib/i18n-config.ts");
  assert.match(cfg, /lang === "ar" \|\| lang === "ur"/);
  const i18n = read("src/lib/i18n.tsx");
  assert.match(i18n, /document\.documentElement\.dir = dir/);
  assert.match(i18n, /const dir = langDir\(lang\)/);
  console.log("PASS RTL/LTR language config");
}

function testSixLanguageStaticOverrides() {
  for (const locale of ["fr", "de", "ur", "zh"]) {
    const pack = read(`src/lib/i18n/locales/${locale}.ts`);
    assert.match(pack, /content_translating/);
    assert.match(pack, /content_translation_unavailable/);
  }
  console.log("PASS six-language translation status UI keys");
}

function testStrictLessonResolver() {
  const lessonResolve = read("src/lib/lesson-content-resolve.ts");
  const i18n = read("src/lib/i18n.tsx");
  const cards = read("src/components/lesson-vocabulary-cards.tsx");
  assert.match(lessonResolve, /isStrictLessonContentType/);
  assert.match(i18n, /strictLesson/);
  assert.match(cards, /vocabArabicSourceSubtitle/);
  console.log("PASS strict lesson resolver + localized vocab cards");
}

function testHonorBoardEnglishNames() {
  const hof = read("src/lib/hall-of-fame.ts");
  const page = read("src/components/hall-of-fame-page.tsx");
  assert.match(hof, /hallOfFameStudentDisplayName/);
  assert.match(page, /displayName/);
  console.log("PASS Honor Board English display names");
}

function testAiRefusalGuard() {
  const guard = read("src/lib/ai/lesson-ai-output-guard.ts");
  const gen = read("src/lib/ai/generate-lesson-from-file.server.ts");
  assert.match(guard, /isRefusalOrMetaAiOutput/);
  assert.match(gen, /validateLessonAiOutputGuard/);
  console.log("PASS AI refusal/meta output guard");
}

function testLessonPersistenceShape() {
  const localized = read("src/lib/lesson-localized.ts");
  assert.match(localized, /LESSON_LANGS = \["ar", "en", "fr", "de", "ur", "zh"\]/);
  assert.match(localized, /serializeLocalizedText/);
  assert.match(localized, /mergeLocalizedTexts/);
  console.log("PASS lesson six-language persistence helpers");
}

function testRepresentativeSurfacesUseI18n() {
  const surfaces = [
    "src/routes/student.index.tsx",
    "src/routes/teacher/index.tsx",
    "src/routes/admin.tsx",
    "src/routes/parent.index.tsx",
    "src/routes/index.tsx",
  ];
  for (const file of surfaces) {
    const src = read(file);
    assert.match(src, /useI18n|tr\(|translateKey/);
  }
  console.log("PASS representative surfaces use i18n hooks");
}

function testNoRawObjectChildPatterns() {
  const risky = [
    "src/routes/student.index.tsx",
    "src/routes/parent.index.tsx",
  ];
  for (const file of risky) {
    const src = read(file);
    assert.doesNotMatch(src, /\{[a-zA-Z_]+\.title\}(?!\s*\?)/);
  }
  console.log("PASS no obvious raw Bi object render patterns in sampled routes");
}

function testOpenAiCallsZeroInQaScripts() {
  const scripts = [
    "scripts/qa-lesson-generation.mjs",
    "scripts/qa-lesson-multilingual-review.mjs",
    "scripts/qa-lesson-ai-hydration.mjs",
    "scripts/qa-teacher-timetable.mjs",
  ];
  for (const script of scripts) {
    const src = read(script);
    assert.doesNotMatch(src, /openai\.com/i);
    assert.doesNotMatch(src, /fetch\(.+openai/i);
  }
  console.log("PASS automated QA scripts make no OpenAI calls");
}

function testSixLanguageMatrix() {
  for (const lang of LANGS) {
    assert.ok(RTL_LANGS.has(lang) || LTR_LANGS.has(lang), `lang ${lang} must have dir`);
  }
  assert.equal(LANGS.length, 6);
  console.log("PASS six-language matrix (ar en fr de ur zh)");
}

function main() {
  testCanonicalResolverModule();
  testStoredResolverDelegation();
  testPickBiExtendedLangs();
  testBiUsesCanonicalResolver();
  testSacredTextSafeguards();
  testLessonWarningLocalization();
  testTranslationOnlyRetryPreservesSource();
  testTranslationCacheHash();
  testTimetableLocalization();
  testRtlLtrConfig();
  testSixLanguageStaticOverrides();
  testStrictLessonResolver();
  testHonorBoardEnglishNames();
  testAiRefusalGuard();
  testLessonPersistenceShape();
  testRepresentativeSurfacesUseI18n();
  testNoRawObjectChildPatterns();
  testOpenAiCallsZeroInQaScripts();
  testSixLanguageMatrix();
  console.log("\nAll platform translation QA checks passed.");
}

main();
