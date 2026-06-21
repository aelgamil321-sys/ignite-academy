/**
 * Verify homepage stats against production Supabase (published lessons, anon RLS).
 * Usage: node scripts/verify-homepage-stats.mjs
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

function hasUrl(v) {
  return Boolean(v?.trim());
}

const VIDEO_COLUMNS = ["youtube_url_ar", "youtube_url_en", "youtube_url"];
const FILE_COLUMNS = [
  "worksheet_ar_url",
  "worksheet_en_url",
  "worksheet_url",
  "pdf_ar_url",
  "pdf_en_url",
  "pdf_url",
  "ppt_ar_url",
  "ppt_en_url",
  "ppt_url",
];

function countFields(row, columns) {
  return columns.reduce((sum, col) => sum + (hasUrl(row[col]) ? 1 : 0), 0);
}

function countQuiz(raw) {
  if (!Array.isArray(raw)) return 0;
  return raw.filter((q) => {
    const text = q?.q;
    const en = typeof text?.en === "string" ? text.en.trim() : "";
    const ar = typeof text?.ar === "string" ? text.ar.trim() : "";
    return Boolean(en || ar);
  }).length;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const select = [
  "id",
  "published",
  "is_deleted",
  ...VIDEO_COLUMNS,
  ...FILE_COLUMNS,
  "quiz",
].join(",");

const res = await fetch(`${url}/rest/v1/lessons?select=${select}&published=eq.true`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
});

if (!res.ok) {
  console.error("Supabase query failed:", res.status, await res.text());
  process.exit(1);
}

const rows = await res.json();
const active = rows.filter((r) => !r.is_deleted);

const stats = {
  lessonCount: active.length,
  videoCount: active.reduce((sum, r) => sum + countFields(r, VIDEO_COLUMNS), 0),
  educationalFileCount: active.reduce((sum, r) => sum + countFields(r, FILE_COLUMNS), 0),
  assessmentCount: active.reduce((sum, r) => sum + countQuiz(r.quiz), 0),
};

console.log("Lessons:", stats.lessonCount);
console.log("Video URLs:", stats.videoCount);
console.log("Educational files:", stats.educationalFileCount);
console.log("Quiz questions:", stats.assessmentCount);

const ok =
  stats.lessonCount >= 2 &&
  stats.videoCount > 0 &&
  stats.educationalFileCount > 0 &&
  stats.assessmentCount > 0;

if (!ok) {
  console.error("Verification failed — expected lessons>=2, videos>0, files>0, quizzes>0");
  process.exit(1);
}

console.log("Verification passed.");
