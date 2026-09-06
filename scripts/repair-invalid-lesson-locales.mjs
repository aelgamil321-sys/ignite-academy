/**
 * Clear INVALID localized lesson fields and fill via targeted OpenAI translation.
 * Run: node scripts/repair-invalid-lesson-locales.mjs [lessonId]
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const LESSON_ID = process.argv[2] ?? "b36a233a-fd91-4378-96b9-07ca48e5c69e";
const LANGS = ["ar", "en", "fr", "de", "ur", "zh"];
const TARGET_LANGS = ["fr", "de", "ur", "zh"];

const REFUSAL_RE =
  /\bi['’]?m sorry\b|\bi can only assist\b|\bi cannot\b|\bas an ai\b|\bplease provide\b|\bi am unable\b|\bhere is the translation\b|\bif you have any specific questions\b|\bislamic studies content in english\b/i;

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

function isInvalid(value) {
  const v = value?.trim() ?? "";
  return Boolean(v) && REFUSAL_RE.test(v);
}

function isMissing(value) {
  return !String(value ?? "").trim();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateField(sourceText, targetLang, fieldLabel) {
  const apiKey = process.env.OPENAI_API_KEY;
  assert.ok(apiKey, "OPENAI_API_KEY required for repair");
  const langLabel = { fr: "French", de: "German", ur: "Urdu", zh: "Simplified Chinese" }[targetLang];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Translate Islamic Studies lesson content. Return ONLY the translated text. Never output refusal, meta, or assistant commentary.",
        },
        {
          role: "user",
          content: `Field: ${fieldLabel}\nTarget language: ${langLabel}\nSource text:\n${sourceText}`,
        },
      ],
    }),
  });
  assert.ok(res.ok, `OpenAI HTTP ${res.status}`);
  const body = await res.json();
  const text = body.choices?.[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, "");
  assert.ok(text && !isInvalid(text), `Rejected invalid translation for ${fieldLabel}.${targetLang}`);
  return text;
}

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: row, error } = await admin.from("lessons").select("*").eq("id", LESSON_ID).maybeSingle();
assert.ifError(error);
assert.ok(row, "lesson must exist");

const fields = ["title", "outcome", "explanation", "unit"];
const before = {};
const after = {};
const invalidBefore = [];
const repairPlan = [];

for (const field of fields) {
  before[field] = parseLocalizedText(row[field]);
  after[field] = { ...before[field] };
  for (const lang of LANGS) {
    if (isInvalid(before[field][lang])) {
      invalidBefore.push(`${field}.${lang}`);
      after[field][lang] = "";
    }
  }
}

for (const field of fields) {
  const source = before[field].en?.trim() || before[field].ar?.trim();
  if (!source) continue;
  for (const lang of TARGET_LANGS) {
    if (isInvalid(before[field][lang])) {
      repairPlan.push({ field, lang, source });
    }
  }
}

let openAiCalls = 0;
for (const job of repairPlan) {
  const translated = await translateField(job.source, job.lang, job.field);
  after[job.field][job.lang] = translated;
  openAiCalls += 1;
  await sleep(400);
}

if (repairPlan.length > 0) {
  const { error: updateError } = await admin
    .from("lessons")
    .update({
      title: after.title,
      outcome: after.outcome,
      explanation: after.explanation,
      unit: after.unit,
    })
    .eq("id", LESSON_ID);
  assert.ifError(updateError);
}

const invalidAfter = [];
for (const field of fields) {
  for (const lang of LANGS) {
    if (isInvalid(after[field][lang])) invalidAfter.push(`${field}.${lang}`);
  }
}

console.log(
  JSON.stringify(
    {
      lessonId: LESSON_ID,
      invalid_before: invalidBefore,
      invalid_after: invalidAfter,
      slots_repaired: repairPlan.map((j) => `${j.field}.${j.lang}`),
      openAiCalls,
      english_preserved: fields.every((f) => after[f].en === before[f].en),
      arabic_preserved: fields.every((f) => after[f].ar === before[f].ar),
    },
    null,
    2,
  ),
);
