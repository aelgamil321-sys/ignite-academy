/**
 * Export English UI strings used for leakage detection in fr/de/ur/zh modes.
 * Excludes very short strings and content that may legitimately appear (URLs, emails).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enT = JSON.parse(readFileSync(join(root, "scripts/en-t.json"), "utf8"));
const enL = JSON.parse(readFileSync(join(root, "scripts/en-l.json"), "utf8"));

const SPURIOUS = new Set([
  "en", "ar", "lang", "locale", "dir", "setLang", "toggle", "tr", "trf", "bi", "biMaybe",
  "contentTranslating", "translationUnavailable", "setLessonScope",
]);

const SKIP_PATTERNS = [
  /^[A-Z0-9 #]+$/,
  /^\+?\d/,
  /@/,
  /^https?:/,
  /^Grade \d/,
  /^KG/,
  /^Section [A-F]$/,
  /^Islamic [AB]$/,
  /^PDF$/,
  /^pt$/,
  /^pts$/,
];

const strings = new Set();
for (const [k, v] of Object.entries(enT)) {
  if (SPURIOUS.has(k) || typeof v !== "string" || v.length < 4) continue;
  if (!SKIP_PATTERNS.some((p) => p.test(v))) strings.add(v);
}
for (const s of enL) {
  if (typeof s === "string" && s.length >= 4 && !SKIP_PATTERNS.some((p) => p.test(s))) strings.add(s);
}

// Sort longest first for greedy matching
const sorted = [...strings].sort((a, b) => b.length - a.length);
console.log(JSON.stringify(sorted));
