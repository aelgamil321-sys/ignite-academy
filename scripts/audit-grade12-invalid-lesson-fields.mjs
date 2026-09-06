/**
 * Scan published Grade 12 lessons for INVALID/MISSING localized fields (read-only).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const LANGS = ["ar", "en", "fr", "de", "ur", "zh"];

const REFUSAL_RE =
  /\bi['’]?m sorry\b|\bi can only assist\b|\bi cannot\b|\bi can't\b|\bas an ai\b|\bas a language model\b|\bplease provide\b|\bi am unable\b|\bhere is the translation\b|\bi(?:'m| am) not able to\b|\bunable to help\b|\bif you have any specific questions\b|\bislamic studies content in english\b/i;

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

function slotStatus(bi, lang) {
  const value = parseLocalizedText(bi)[lang]?.trim() ?? "";
  if (!value) return "MISSING";
  if (REFUSAL_RE.test(value)) return "INVALID";
  return "VALID";
}

function printMatrix(label, bi) {
  console.log(`\n=== ${label} ===`);
  console.log("field | ar | en | fr | de | ur | zh");
  const row = (field, data) =>
    console.log(
      `${field} | ${LANGS.map((lang) => slotStatus(data, lang)).join(" | ")}`,
    );
  row("title", bi.title);
  row("outcome", bi.outcome);
  row("summary/content", bi.explanation);
  row("unit", bi.unit);
}

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: rows, error } = await admin
  .from("lessons")
  .select("id, title, outcome, explanation, unit, published, grade, is_deleted")
  .eq("is_deleted", false)
  .order("created_at", { ascending: false });

if (error) throw error;

const grade12 = (rows ?? []).filter((r) => {
  const g = String(r.grade ?? "").trim();
  return g === "12" || g.toLowerCase().includes("grade 12") || g === "Grade 12";
});

const publishedGrade12 = grade12.filter((r) => r.published);

console.log(JSON.stringify({ grade12Total: grade12.length, grade12PublishedCount: publishedGrade12.length }, null, 2));

for (const row of publishedGrade12) {
  printMatrix(`published lesson ${row.id}`, row);
}

for (const id of ["5313bac9-d1ed-413f-b2f8-34441fbe146a", "b36a233a-fd91-4378-96b9-07ca48e5c69e"]) {
  const row = (rows ?? []).find((r) => r.id === id);
  if (row) printMatrix(`pinned lesson ${row.id} (published=${row.published})`, row);
}

// Scan all published for INVALID in any lang
const invalidHits = [];
for (const row of rows ?? []) {
  for (const field of ["title", "outcome", "explanation", "unit"]) {
    for (const lang of LANGS) {
      const value = parseLocalizedText(row[field])[lang]?.trim() ?? "";
      if (value && REFUSAL_RE.test(value)) {
        invalidHits.push({ id: row.id, grade: row.grade, field, lang });
      }
    }
  }
}

for (const row of rows ?? []) {
  if (invalidHits.some((h) => h.id === row.id)) {
    printMatrix(`INVALID lesson ${row.id} (grade ${row.grade}, published=${row.published})`, row);
  }
}

console.log("\n=== INVALID hits ===");
console.log(JSON.stringify(invalidHits, null, 2));
