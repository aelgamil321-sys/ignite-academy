/**
 * QA checks for lesson AI generation (run: node scripts/qa-lesson-generation.mjs)
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// --- Inline mirrors of server helpers for QA without TS runner ---
function inferLessonFileType(fileName) {
  const lower = fileName.trim().toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".pptx")) return "pptx";
  if (lower.endsWith(".ppt")) return "ppt";
  return null;
}

function isLegacyPptBinary(bytes) {
  return bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

function trimExtractedText(text, maxChars = 100_000) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}\n\n[Text truncated for AI processing]`;
}

async function extractPptxText(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] ?? 0) - Number(b.match(/slide(\d+)/i)?.[1] ?? 0));
  const slides = [];
  for (const name of slideNames) {
    const xml = await zip.file(name)?.async("text");
    if (!xml) continue;
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]).filter(Boolean);
    if (texts.length) slides.push(`Slide ${slides.length + 1}:\n${texts.join(" ")}`);
  }
  return slides.join("\n\n");
}

function parseLessonAiJson(raw) {
  const parsed = JSON.parse(raw);
  assert.ok(parsed.lesson_summary, "lesson_summary required");
  assert.ok(Array.isArray(parsed.vocabulary), "vocabulary array required");
  assert.ok(parsed.quiz, "quiz required");
  return parsed;
}

function auditClientBundleForSecrets() {
  const candidates = [join(root, "dist", "client"), join(root, ".output", "public")];
  const hits = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|mjs)$/.test(entry.name)) {
        const content = readFileSync(full, "utf8");
        if (/generate-lesson-from-file\.server|openai-lesson-generation-provider\.server/.test(content)) {
          hits.push(full);
        }
        if (/sk-[a-zA-Z0-9]{20,}/.test(content)) hits.push(full);
        if (/OPENAI_API_KEY\s*[:=]\s*["'][^"']+["']/.test(content)) hits.push(full);
        if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']{10,}/.test(content)) hits.push(full);
      }
    }
  }
  for (const dir of candidates) {
    try {
      walk(dir);
    } catch {
      // ignore
    }
  }
  return hits;
}
function auditBundleForSecrets() {
  const candidates = [join(root, "dist", "server"), join(root, ".output", "server")];
  const hits = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".mjs") || entry.name.endsWith(".js")) {
        const content = readFileSync(full, "utf8");
        if (/sk-[a-zA-Z0-9]{20,}/.test(content)) hits.push(full);
        if (/OPENAI_API_KEY\s*=\s*["'][^"']+["']/.test(content)) hits.push(full);
        if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+["']/.test(content)) hits.push(full);
      }
    }
  }
  for (const dir of candidates) {
    try {
      walk(dir);
    } catch {
      // directory may not exist before build
    }
  }
  return hits;
}

// A. valid file type inference
assert.equal(inferLessonFileType("lesson.pdf"), "pdf");
assert.equal(inferLessonFileType("lesson.PPTX"), "pptx");

// B. valid PPTX extraction
const zip = new JSZip();
zip.file(
  "ppt/slides/slide1.xml",
  '<p:sld><p:sp><a:t>Slide one text</a:t></p:sp><p:sp><a:t>More text</a:t></p:sp></p:sld>',
);
zip.file(
  "ppt/slides/slide2.xml",
  '<p:sld><p:sp><a:t>Slide two</a:t></p:sp></p:sld>',
);
const pptxBytes = await zip.generateAsync({ type: "uint8array" });
const pptxText = await extractPptxText(pptxBytes);
assert.match(pptxText, /Slide one text/);
assert.match(pptxText, /Slide two/);

// C. unsupported file
assert.equal(inferLessonFileType("notes.docx"), null);

// D. oversized trim
const huge = "a".repeat(120_000);
const trimmed = trimExtractedText(huge, 100_000);
assert.ok(trimmed.length < huge.length);
assert.match(trimmed, /truncated/i);

// E/F/G. malformed / valid JSON
assert.throws(() => parseLessonAiJson("{bad"));
const validJson = JSON.stringify({
  lesson_summary: "Summary about wudu.",
  vocabulary: [
    { term: "Wudu", synonym_or_simple_meaning: "Ablution" },
    { term: "Tahara", synonym_or_simple_meaning: "Purity" },
    { term: "Wudu", synonym_or_simple_meaning: "Ablution" },
    { term: "Wudu", synonym_or_simple_meaning: "Ablution" },
    { term: "Wudu", synonym_or_simple_meaning: "Ablution" },
  ],
  quiz: {
    multiple_choice: Array.from({ length: 4 }, (_, i) => ({
      question: `Q${i + 1}`,
      options: ["a", "b", "c", "d"],
      correctAnswer: 0,
      explanation: "e",
    })),
    true_false: Array.from({ length: 4 }, (_, i) => ({
      statement: `S${i + 1}`,
      correctAnswer: true,
      explanation: "e",
    })),
    essay: Array.from({ length: 2 }, (_, i) => ({
      question: `E${i + 1}`,
      modelAnswer: "A1",
      gradingGuide: "Guide",
    })),
  },
  warnings: [],
});
assert.ok(parseLessonAiJson(validJson).lesson_summary);

// H. empty extracted text guard
assert.equal(trimExtractedText("   "), "");

// I. legacy ppt binary detection
assert.ok(isLegacyPptBinary(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0x00])));

// J/K covered by mapper integration in app — save uses existing serialize paths

// L. Structured Outputs schema — keep in sync with lesson-generation-types.ts
const mcQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string(),
});
const lessonAiOutputSchema = z.object({
  lesson_summary: z.string().min(1),
  vocabulary: z
    .array(
      z.object({
        term: z.string().min(1),
        synonym_or_simple_meaning: z.string().min(1),
      }),
    )
    .min(5)
    .max(10),
  quiz: z.object({
    multiple_choice: z.array(mcQuestionSchema).length(4),
    true_false: z
      .array(
        z.object({
          statement: z.string().min(1),
          correctAnswer: z.boolean(),
          explanation: z.string(),
        }),
      )
      .length(4),
    essay: z
      .array(
        z.object({
          question: z.string().min(1),
          modelAnswer: z.string(),
          gradingGuide: z.string(),
        }),
      )
      .length(2),
  }),
  warnings: z.array(z.string()),
});

const typesSource = readFileSync(join(root, "src/lib/ai/lesson-generation-types.ts"), "utf8");
assert.ok(!typesSource.includes("z.tuple"), "lesson-generation-types.ts must not use z.tuple for MCQ options");
assert.match(
  typesSource,
  /correctAnswer:\s*z\.number\(\)\.int\(\)\.min\(0\)\.max\(3\)/,
  "MCQ correctAnswer must be a 0–3 integer index",
);

const structuredFormat = zodTextFormat(lessonAiOutputSchema, "ignite_lesson_generation_output");
assert.ok(structuredFormat, "zodTextFormat must succeed for lesson AI output schema");
const structuredSchemaJson = JSON.stringify(structuredFormat.schema ?? structuredFormat);
assert.ok(!structuredSchemaJson.includes("prefixItems"), "Structured schema must not use tuple prefixItems");
assert.ok(!/"oneOf".*correctAnswer/s.test(structuredSchemaJson), "MCQ correctAnswer must not be a union");
assert.match(structuredSchemaJson, /"minItems":4/);
assert.match(structuredSchemaJson, /"maxItems":4/);
assert.match(structuredSchemaJson, /"additionalProperties":false/);

// M. translation structured output schema (mirror lesson-translation-types.ts)
const translatedLanguageLessonSchema = z.object({
  lesson_title: z.string().min(1),
  learning_outcome: z.string().min(1),
  lesson_summary: z.string().min(1),
  vocabulary: z
    .array(
      z.object({
        term: z.string().min(1),
        synonym_or_simple_meaning: z.string().min(1),
      }),
    )
    .min(5)
    .max(10),
  quiz: z.object({
    multiple_choice: z.array(mcQuestionSchema).length(4),
    true_false: z
      .array(
        z.object({
          statement: z.string().min(1),
          correctAnswer: z.boolean(),
          explanation: z.string(),
        }),
      )
      .length(4),
    essay: z
      .array(
        z.object({
          question: z.string().min(1),
          modelAnswer: z.string(),
          gradingGuide: z.string(),
        }),
      )
      .length(2),
  }),
});
const translationOutputSchema = z.object({
  ar: translatedLanguageLessonSchema,
  fr: translatedLanguageLessonSchema,
  de: translatedLanguageLessonSchema,
  ur: translatedLanguageLessonSchema,
  zh: translatedLanguageLessonSchema,
});
const translationFormat = zodTextFormat(translationOutputSchema, "ignite_lesson_translation_output");
assert.ok(translationFormat, "translation zodTextFormat must succeed for en source targets");

const secretHits = auditBundleForSecrets();
assert.equal(secretHits.length, 0, `Possible secret/provider leakage in server bundle: ${secretHits.join(", ")}`);

const clientHits = auditClientBundleForSecrets();
assert.equal(clientHits.length, 0, `Possible secret/provider leakage in client bundle: ${clientHits.join(", ")}`);

console.log("qa-lesson-generation: all checks passed");
