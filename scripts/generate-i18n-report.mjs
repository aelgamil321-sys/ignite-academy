/**
 * Generate i18n audit report: missing keys, hardcoded patterns, modified files hint.
 * Run: node scripts/generate-i18n-report.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { frT, frL } from "./locale-packs/fr.mjs";
import { deT, deL } from "./locale-packs/de.mjs";
import { urT, urL } from "./locale-packs/ur.mjs";
import { zhT, zhL } from "./locale-packs/zh.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const enT = JSON.parse(readFileSync(join(root, "scripts/en-t.json"), "utf8"));
const enL = JSON.parse(readFileSync(join(root, "scripts/en-l.json"), "utf8"));

const SPURIOUS = new Set([
  "en", "ar", "lang", "locale", "dir", "setLang", "toggle", "tr", "trf", "bi", "biMaybe",
  "contentTranslating", "translationUnavailable", "setLessonScope",
]);

const tKeys = Object.keys(enT).filter((k) => !SPURIOUS.has(k) && enT[k] !== "");

function auditLocale(name, tMap, lMap) {
  const missingT = tKeys.filter((k) => !tMap[k]);
  const missingL = enL.filter((s) => !lMap[s]);
  return { name, missingT, missingL };
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!entry.includes("node_modules")) walk(full, files);
    } else if (/\.(tsx?|jsx?)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

const HARDCODED_PATTERNS = [
  { id: "lang_ar_ternary", re: /lang\s*===\s*["']ar["']\s*\?/g },
  { id: "inline_english_ui", re: /(?:title|lead|label|placeholder)=\{?["'][A-Z][^"']{4,}["']\}?/g },
  { id: "toast_english", re: /toast\.(success|error|info)\(["'][A-Z][^"']+["']\)/g },
];

const hardcodedFindings = [];
for (const file of walk(srcDir)) {
  const rel = relative(root, file).replace(/\\/g, "/");
  if (rel.includes("lib/i18n")) continue;
  const content = readFileSync(file, "utf8");
  for (const { id, re } of HARDCODED_PATTERNS) {
    const matches = content.match(re);
    if (matches?.length) {
      hardcodedFindings.push({ file: rel, pattern: id, count: matches.length, samples: matches.slice(0, 5) });
    }
  }
}

let modifiedFiles = [];
try {
  modifiedFiles = execSync("git diff --name-only", { cwd: root, encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
} catch {
  modifiedFiles = [];
}

const localeAudits = [
  auditLocale("fr", frT, frL),
  auditLocale("de", deT, deL),
  auditLocale("ur", urT, urL),
  auditLocale("zh", zhT, zhL),
];

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    totalTKeys: tKeys.length,
    totalLStrings: enL.length,
    hardcodedPatternHits: hardcodedFindings.reduce((n, f) => n + f.count, 0),
    hardcodedFiles: hardcodedFindings.length,
    modifiedFilesCount: modifiedFiles.length,
  },
  missingTranslationKeys: Object.fromEntries(
    localeAudits.map(({ name, missingT, missingL }) => [
      name,
      {
        missingT: missingT.length,
        missingTKeys: missingT,
        missingL: missingL.length,
        missingLSamples: missingL.slice(0, 30),
      },
    ]),
  ),
  hardcodedTextsFound: hardcodedFindings.sort((a, b) => b.count - a.count),
  filesModified: modifiedFiles,
};

const outPath = join(root, "scripts/i18n-audit-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log("=== i18n Audit Report ===");
console.log(`t keys: ${tKeys.length}, L strings: ${enL.length}`);
for (const { name, missingT, missingL } of localeAudits) {
  console.log(`${name}: missing t=${missingT.length}, missing L=${missingL.length}`);
}
console.log(`Hardcoded pattern hits: ${report.summary.hardcodedPatternHits} in ${report.summary.hardcodedFiles} files`);
console.log(`Modified files: ${modifiedFiles.length}`);
console.log(`Report written to ${relative(root, outPath)}`);
