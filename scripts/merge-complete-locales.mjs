/**
 * Merge complete translations into locale packs and fix t-keys wrongly stored in L maps.
 * Run: node scripts/merge-complete-locales.mjs && node scripts/build-locale-files.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { frT, frL } from "./locale-packs/fr.mjs";
import { deT, deL } from "./locale-packs/de.mjs";
import { urT, urL } from "./locale-packs/ur.mjs";
import { zhT, zhL } from "./locale-packs/zh.mjs";
import { ADDITIONS } from "./locale-packs/complete-translations.mjs";
import { FINAL_PARENT_T } from "./locale-packs/final-parent-keys.mjs";
import { STUDENT_ADDITIONS } from "./locale-packs/student-locale-additions.mjs";
import { FINAL_UI } from "./locale-packs/final-ui-keys.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enT = JSON.parse(readFileSync(join(root, "scripts/en-t.json"), "utf8"));
const enL = JSON.parse(readFileSync(join(root, "scripts/en-l.json"), "utf8"));

const SPURIOUS = new Set([
  "en", "ar", "lang", "locale", "dir", "setLang", "toggle", "tr", "trf", "bi", "biMaybe",
  "contentTranslating", "translationUnavailable", "setLessonScope",
]);

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function mergePack(lang, tMap, lMap, additions) {
  const t = { ...tMap };
  const l = { ...lMap };

  // Move misplaced t-keys from L section (key matches enT key name)
  for (const key of Object.keys(l)) {
    if (enT[key] && !SPURIOUS.has(key)) {
      t[key] = l[key];
      delete l[key];
    }
  }

  for (const [k, v] of Object.entries(additions.t)) t[k] = v;
  for (const [en, v] of Object.entries(additions.l)) l[en] = v;
  const finalT = FINAL_PARENT_T[lang] ?? {};
  for (const [k, v] of Object.entries(finalT)) t[k] = v;
  const studentAdd = STUDENT_ADDITIONS[lang] ?? {};
  for (const [k, v] of Object.entries(studentAdd.t ?? {})) t[k] = v;
  for (const [en, v] of Object.entries(studentAdd.l ?? {})) l[en] = v;
  const finalUi = FINAL_UI[lang] ?? {};
  for (const [k, v] of Object.entries(finalUi.t ?? {})) t[k] = v;
  for (const [en, v] of Object.entries(finalUi.l ?? {})) l[en] = v;

  return { t, l };
}

function emitMjs(lang, tMap, lMap) {
  const tLines = Object.entries(tMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${k}: "${esc(v)}",`);
  const lLines = Object.keys(lMap)
    .sort()
    .map((en) => `  "${esc(en)}": "${esc(lMap[en])}",`);
  return `/** ${lang.toUpperCase()} translations for Ignite Islamic Academy UI. */
export const ${lang}T = {
${tLines.join("\n")}
};

/** ${lang.toUpperCase()} translations for L() English strings. */
export const ${lang}L = {
${lLines.join("\n")}
};
`;
}

const packs = [
  ["fr", frT, frL, ADDITIONS.fr],
  ["de", deT, deL, ADDITIONS.de],
  ["ur", urT, urL, ADDITIONS.ur],
  ["zh", zhT, zhL, ADDITIONS.zh],
];

for (const [lang, tMap, lMap, additions] of packs) {
  const { t, l } = mergePack(lang, tMap, lMap, additions);
  const missingT = Object.keys(enT).filter((k) => !SPURIOUS.has(k) && !t[k]);
  const missingL = enL.filter((s) => !l[s]);
  if (missingT.length || missingL.length) {
    console.error(`${lang}: still missing t=${missingT.length} L=${missingL.length}`);
    if (missingT.length) console.error("  t:", missingT.slice(0, 8).join(", "));
    if (missingL.length) console.error("  L:", missingL.slice(0, 5).join(" | "));
    process.exitCode = 1;
  }
  writeFileSync(join(root, `scripts/locale-packs/${lang}.mjs`), emitMjs(lang, t, l), "utf8");
  console.log(`${lang}.mjs: ${Object.keys(t).length} t, ${Object.keys(l).length} L`);
}
