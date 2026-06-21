/**
 * Inspect production lesson media columns (no secrets printed).
 * Usage: node scripts/inspect-lesson-columns.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env");
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const MEDIA_COLUMNS = [
  "youtube_url",
  "youtube_url_ar",
  "youtube_url_en",
  "worksheet_url",
  "worksheet_ar_url",
  "worksheet_en_url",
  "pdf_url",
  "pdf_ar_url",
  "pdf_en_url",
  "ppt_url",
  "ppt_ar_url",
  "ppt_en_url",
];

function preview(v) {
  if (v == null || v === "") return "(empty)";
  const s = String(v);
  return s.length > 72 ? `${s.slice(0, 72)}…` : s;
}

const env = loadEnv();
const base = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!base || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const select = ["id", "published", "is_deleted", ...MEDIA_COLUMNS, "quiz"].join(",");
const res = await fetch(`${base}/rest/v1/lessons?select=${select}&published=eq.true`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

if (!res.ok) {
  console.error("Query failed:", res.status, await res.text());
  process.exit(1);
}

const rows = await res.json();
const active = rows.filter((r) => !r.is_deleted);

console.log(`Published active lessons: ${active.length}\n`);

for (const row of active) {
  console.log(`--- lesson ${row.id} ---`);
  for (const col of MEDIA_COLUMNS) {
    console.log(`  ${col}: ${preview(row[col])}`);
  }
  const quizLen = Array.isArray(row.quiz) ? row.quiz.length : 0;
  console.log(`  quiz array length: ${quizLen}`);
}
