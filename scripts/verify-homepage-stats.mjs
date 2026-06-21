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

function extractYoutubeVideoId(url) {
  if (!url?.trim()) return "";
  const m = url.trim().match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : "";
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

function lessonTitle(row) {
  const t = row.title;
  if (t && typeof t === "object") {
    return String(t.en || t.ar || row.id).trim() || row.id;
  }
  return row.id;
}

function collectLessonYoutubeIds(row) {
  const ids = new Set();
  for (const col of VIDEO_COLUMNS) {
    const id = extractYoutubeVideoId(row[col]);
    if (id) ids.add(id);
  }
  return [...ids];
}

function collectLessonFileUrls(row) {
  return FILE_COLUMNS.flatMap((col) => (hasUrl(row[col]) ? [row[col].trim()] : []));
}

function lessonHasQuiz(row) {
  if (!Array.isArray(row.quiz)) return false;
  return row.quiz.some((q) => {
    const text = q?.q;
    const en = typeof text?.en === "string" ? text.en.trim() : "";
    const ar = typeof text?.ar === "string" ? text.ar.trim() : "";
    return Boolean(en || ar);
  });
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
  "title",
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

const uniqueVideoIds = new Set();
for (const row of active) {
  for (const id of collectLessonYoutubeIds(row)) {
    uniqueVideoIds.add(id);
  }
}

const stats = {
  lessonCount: active.length,
  videoCount: uniqueVideoIds.size,
  educationalFileCount: active.reduce((sum, r) => sum + collectLessonFileUrls(r).length, 0),
  quizCount: active.filter(lessonHasQuiz).length,
};

console.log("--- Per lesson ---\n");
for (const row of active) {
  const videoIds = collectLessonYoutubeIds(row);
  const fileUrls = collectLessonFileUrls(row);
  const hasQuiz = lessonHasQuiz(row);
  console.log(`Lesson: ${lessonTitle(row)}`);
  console.log(`  unique video IDs: ${videoIds.length ? videoIds.join(", ") : "(none)"}`);
  console.log(`  educational files: ${fileUrls.length}`);
  for (const fileUrl of fileUrls) {
    const preview = fileUrl.length > 80 ? `${fileUrl.slice(0, 80)}…` : fileUrl;
    console.log(`    - ${preview}`);
  }
  console.log(`  quiz: ${hasQuiz ? "yes" : "no"}`);
  console.log("");
}

console.log("--- Totals ---");
console.log("Lessons:", stats.lessonCount);
console.log("Unique videos:", stats.videoCount);
console.log("Educational files:", stats.educationalFileCount);
console.log("Quizzes (lessons with quiz):", stats.quizCount);

const expected = { lessonCount: 2, videoCount: 3, educationalFileCount: 4, quizCount: 2 };
const ok = Object.entries(expected).every(([key, value]) => stats[key] === value);

if (!ok) {
  console.error("Verification failed — expected:", expected, "got:", stats);
  process.exit(1);
}

console.log("Verification passed.");
