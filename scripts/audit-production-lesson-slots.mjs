/**
 * Audit production lesson localized slots (safe matrix, no full content).
 * Run: node scripts/audit-production-lesson-slots.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const LESSON_IDS = [
  "b36a233a-fd91-4378-96b9-07ca48e5c69e",
  "5313bac9-d1ed-413f-b2f8-34441fbe146a",
];
const LANGS = ["ar", "en", "fr", "de", "ur", "zh"];

const REFUSAL_RE =
  /\bi['’]?m sorry\b|\bi can only assist\b|\bi cannot\b|\bas an ai\b/i;

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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

function parseLocalizedText(raw) {
  const out = Object.fromEntries(LANGS.map((lang) => [lang, ""]));
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const lang of LANGS) {
      if (raw[lang] !== undefined) out[lang] = String(raw[lang] ?? "");
    }
  }
  return out;
}

function wordSlotStatus(word, lang) {
  const parsed = parseLocalizedText(word);
  const value = parsed[lang]?.trim() ?? "";
  if (!value) return "MISSING";
  if (REFUSAL_RE.test(value)) return "INVALID";
  const ar = parsed.ar?.trim() ?? "";
  if (lang !== "ar" && ar && value === ar) return "MISSING";
  const arabic = /[\u0600-\u06FF]/;
  const latin = /[A-Za-z]/;
  const cjk = /[\u4E00-\u9FFF]/;
  if (lang === "en" || lang === "fr" || lang === "de") {
    if (arabic.test(value) && !latin.test(value)) return "MISSING";
  }
  if (lang === "zh" && !cjk.test(value) && latin.test(value)) return "MISSING";
  return "PRESENT";
}

function slotStatus(bi, lang) {
  const value = parseLocalizedText(bi)[lang]?.trim() ?? "";
  if (!value) return "MISSING";
  if (REFUSAL_RE.test(value)) return "INVALID";
  return "PRESENT";
}

function parseVocab(raw) {
  if (!raw || typeof raw !== "object") return [];
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [];
  return items.map((item) => ({
    word: parseLocalizedText(item?.word ?? item?.term),
    meaning: parseLocalizedText(item?.meaning ?? item?.def),
  }));
}

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && serviceKey, "Supabase env required");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

for (const lessonId of LESSON_IDS) {
  const { data: row, error } = await admin
    .from("lessons")
    .select("title, outcome, explanation, vocab")
    .eq("id", lessonId)
    .maybeSingle();
  assert.ifError(error);
  if (!row) {
    console.log(`lesson ${lessonId}: NOT FOUND`);
    continue;
  }

  console.log(`\n=== lesson ${lessonId} ===`);
  const fields = [
    ["title", row.title],
    ["outcome", row.outcome],
    ["summary/content", row.explanation],
  ];

  console.log("field | ar | en | fr | de | ur | zh");
  for (const [name, bi] of fields) {
    const cols = LANGS.map((lang) => slotStatus(bi, lang)).join(" | ");
    console.log(`${name} | ${cols}`);
  }

  const vocab = parseVocab(row.vocab);
  vocab.forEach((item, index) => {
    const wordCols = LANGS.map((lang) => wordSlotStatus(item.word, lang)).join(" | ");
    const meaningCols = LANGS.map((lang) => slotStatus(item.meaning, lang)).join(" | ");
    console.log(`vocab[${index}].word | ${wordCols}`);
    console.log(`vocab[${index}].meaning | ${meaningCols}`);
  });
}

console.log("\naudit-production-lesson-slots: done");
