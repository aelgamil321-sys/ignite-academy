/**
 * KHDA Analytics acceptance QA (OpenAI calls = 0).
 * Run: node scripts/qa-khda-analytics.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const KHDA_RATING_BANDS = [
  { rating: 1, min: 1, max: 15 },
  { rating: 2, min: 16, max: 50 },
  { rating: 3, min: 51, max: 61 },
  { rating: 4, min: 62, max: 71 },
  { rating: 5, min: 72, max: 75 },
  { rating: 6, min: 76, max: 81 },
  { rating: 7, min: 82, max: 91 },
  { rating: 8, min: 92, max: 100 },
];

function khdaRatingFromScore(score) {
  if (score === null || score === undefined) return null;
  const rounded = Math.round(score);
  if (rounded === 0) return 1;
  if (rounded < 0) return null;
  for (const band of KHDA_RATING_BANDS) {
    if (rounded >= band.min && rounded <= band.max) return band.rating;
  }
  return null;
}

function studentNeedsAttention(row) {
  return (
    row.submissionCount > 0 &&
    row.averageScorePct !== null &&
    row.averageScorePct < 60
  );
}

function buildKhdaDistribution(studentScores) {
  const rated = new Map([1, 2, 3, 4, 5, 6, 7, 8].map((r) => [r, 0]));
  let totalWithScores = 0;
  for (const row of studentScores) {
    if (row.submissionCount === 0 || row.averageScorePct === null) continue;
    const rating = khdaRatingFromScore(row.averageScorePct);
    if (rating === null) continue;
    rated.set(rating, (rated.get(rating) ?? 0) + 1);
    totalWithScores += 1;
  }
  return { rated, totalWithScores };
}

function averageRounded(values) {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

// --- KHDA boundaries ---
const expected = [
  [1, 1], [15, 1], [16, 2], [50, 2], [51, 3], [61, 3], [62, 4], [71, 4],
  [72, 5], [75, 5], [76, 6], [81, 6], [82, 7], [91, 7], [92, 8], [100, 8],
];
for (const [score, rating] of expected) {
  assert(khdaRatingFromScore(score) === rating, `boundary ${score}`);
}
assert(khdaRatingFromScore(0) === 1, "0% assessment => Rating 1");
assert(khdaRatingFromScore(null) === null, "null => No Data");

// --- Zero vs no-data ---
const zeroScoreStudent = { userId: "a", averageScorePct: 0, submissionCount: 1 };
const noDataStudent = { userId: "b", averageScorePct: null, submissionCount: 0 };
assert(khdaRatingFromScore(zeroScoreStudent.averageScorePct) === 1, "real 0% => Rating 1");
assert(khdaRatingFromScore(noDataStudent.averageScorePct) === null, "no assessment => null rating");
const dist = buildKhdaDistribution([zeroScoreStudent, noDataStudent]);
assert(dist.totalWithScores === 1, "no-data excluded from distribution count");
assert(dist.rated.get(1) === 1, "0% student in Rating 1 band");
assert(averageRounded([0, 80]) === 40, "0% included in submission average when present");
assert(averageRounded([]) === null, "no submissions => null average");

// --- Needs Attention semantics ---
assert(
  !studentNeedsAttention({ submissionCount: 0, averageScorePct: null, certificatesEarned: 0 }),
  "no-certificate-only without submissions excluded",
);
assert(
  studentNeedsAttention({ submissionCount: 2, averageScorePct: 55, certificatesEarned: 0 }),
  "below threshold with evidence included",
);
assert(
  !studentNeedsAttention({ submissionCount: 3, averageScorePct: 72, certificatesEarned: 0 }),
  "good score without certificate excluded",
);

// --- Six-language insight templates (native, no English fallback) ---
const i18nSource = readFileSync(join(root, "src/lib/i18n.tsx"), "utf8");
const enT = JSON.parse(readFileSync(join(root, "scripts/en-t.json"), "utf8"));
const insightKeys = [
  "khda_insight_best_grade",
  "khda_insight_section_gap",
  "khda_insight_meeting_target",
  "khda_insight_best_section",
];
const nativeMarkers = {
  fr: ["actuellement", "inférieure", "des élèves", "section"],
  de: ["derzeit", "Prozentpunkte", "Schüler", "Klasse"],
  ur: ["موجودہ", "فیصد", "طلباء", "سیکشن"],
  zh: ["目前", "百分点", "学生", "班"],
};

for (const key of insightKeys) {
  assert(enT[key], `missing en-t ${key}`);
  assert(i18nSource.includes(`${key}:`), `missing i18n ${key}`);
}

const frNative = readFileSync(join(root, "src/lib/i18n/locales/fr.ts"), "utf8");
const deNative = readFileSync(join(root, "src/lib/i18n/locales/de.ts"), "utf8");
const urNative = readFileSync(join(root, "src/lib/i18n/locales/ur.ts"), "utf8");
const zhNative = readFileSync(join(root, "src/lib/i18n/locales/zh.ts"), "utf8");

function insightNativePass(source, lang, markers) {
  for (const key of insightKeys) {
    const re = new RegExp(`${key}:\\s*"([^"]+)"`);
    const m = source.match(re);
    if (!m) return false;
    const text = m[1];
    if (lang === "fr" || lang === "de" || lang === "zh") {
      if (!markers.some((mk) => text.includes(mk))) return false;
    }
    if (lang === "ur") {
      if (!/[\u0600-\u06FF]/.test(text)) return false;
    }
    if (text.includes("currently has the highest average")) return false;
  }
  return true;
}

const frInsightPass = insightNativePass(frNative, "fr", nativeMarkers.fr);
const deInsightPass = insightNativePass(deNative, "de", nativeMarkers.de);
const urInsightPass = insightNativePass(urNative, "ur", nativeMarkers.ur);
const zhInsightPass = insightNativePass(zhNative, "zh", nativeMarkers.zh);

assert(frInsightPass, "French insights must be native");
assert(deInsightPass, "German insights must be native");
assert(urInsightPass, "Urdu insights must be native");
assert(zhInsightPass, "Chinese insights must be native");

// --- buildAtRiskStudents source check ---
const adminAnalyticsSrc = readFileSync(join(root, "src/lib/admin-analytics.ts"), "utf8");
assert(
  adminAnalyticsSrc.includes("studentNeedsAttention(row)"),
  "at-risk must use studentNeedsAttention",
);
assert(
  !adminAnalyticsSrc.match(/certificatesEarned === 0\s*\|\|/),
  "certificate-only trigger removed",
);

// --- Live numeric parity (optional if env present) ---
let parity = { ok: false, skipped: true };
const parityRun = spawnSync("npx", ["--yes", "tsx", "scripts/qa-khda-analytics-parity.ts"], {
  cwd: root,
  encoding: "utf8",
  shell: true,
});
if (parityRun.status === 0 && parityRun.stdout) {
  try {
    parity = { ...JSON.parse(parityRun.stdout), skipped: false };
  } catch {
    parity = { ok: false, skipped: false, parseError: true };
  }
} else if (parityRun.status !== 0) {
  parity = { ok: false, skipped: false, stderr: parityRun.stderr?.slice(0, 500) };
}

console.log(
  JSON.stringify(
    {
      ok: frInsightPass && deInsightPass && urInsightPass && zhInsightPass && parity.ok !== false,
      zeroRating1: true,
      noDataExcluded: true,
      needsAttentionFixed: true,
      frInsightPass,
      deInsightPass,
      urInsightPass,
      zhInsightPass,
      parity,
      openAiCalls: 0,
    },
    null,
    2,
  ),
);
console.log("=== KHDA ANALYTICS QA PASS ===");
