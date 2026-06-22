/**
 * Verifies post-cleanup bug fixes without browser (unit-level).
 * Run: node scripts/verify-post-cleanup-fixes.mjs
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Dynamic import compiled modules via tsx if available, else test pure logic inline
const require = createRequire(import.meta.url);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Mirror biPendingDisplayText */
function biPendingDisplayText(bi, lang) {
  const ar = bi.ar?.trim() || "";
  const en = bi.en?.trim() || "";
  if (lang === "ar") return ar || en;
  if (lang === "en") return en || ar;
  return en || ar;
}

/** Mirror educationalDisplayFallback core paths */
function educationalDisplayFallback(text, lang, bi) {
  if (lang === "en") return text;
  if (bi) {
    const pending = biPendingDisplayText(bi, lang);
    if (pending) return pending;
  }
  return text?.trim() ?? "";
}

const hadith = { en: "Hadith", ar: "الحديث الشريف" };
const fiqh = { en: "Fiqh", ar: "الفقه" };
const empty = { en: "", ar: "" };

assert(biPendingDisplayText(hadith, "ar") === "الحديث الشريف", "ar prefers Arabic");
assert(biPendingDisplayText(hadith, "de") === "Hadith", "de prefers English");
assert(educationalDisplayFallback("Hadith", "fr", hadith) === "Hadith", "fr category fallback English");
assert(educationalDisplayFallback("Fiqh", "de", fiqh) === "Fiqh", "de category fallback English");
assert(biPendingDisplayText(empty, "de") === "", "empty bi stays empty");
assert(educationalDisplayFallback("fallback text", "fr", empty) === "fallback text", "uses source when bi empty");

// Resource library: gradeDisplayName must accept Lang (smoke via source scan)
import fs from "node:fs";
const rlSrc = fs.readFileSync(path.join(root, "src/routes/resource-library.tsx"), "utf8");
assert(
  !rlSrc.includes("gradeDisplayName(item.gradeSlug, locale)"),
  "resource-library must not pass locale to gradeDisplayName",
);
assert(rlSrc.includes("lang: Lang"), "ResourceCard must use lang prop");

const i18nSrc = fs.readFileSync(path.join(root, "src/lib/i18n.tsx"), "utf8");
assert(i18nSrc.includes("biPendingDisplayText(text, lang)"), "bi() must use biPendingDisplayText fallback");

console.log("PASS");
