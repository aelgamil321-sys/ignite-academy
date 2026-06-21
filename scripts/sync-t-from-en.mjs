/**
 * Sync new t-key translations from L() maps (match by English text) and en-t.json.
 * Run after updating i18n.tsx: node scripts/extract-en.mjs && node scripts/sync-t-from-en.mjs && node scripts/build-locale-files.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { frT, frL } from "./locale-packs/fr.mjs";
import { deT, deL } from "./locale-packs/de.mjs";
import { urT, urL } from "./locale-packs/ur.mjs";
import { zhT, zhL } from "./locale-packs/zh.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enT = JSON.parse(readFileSync(join(root, "scripts/en-t.json"), "utf8"));

const SPURIOUS = new Set([
  "en", "ar", "lang", "locale", "dir", "setLang", "toggle", "tr", "bi", "biMaybe",
  "contentTranslating", "translationUnavailable", "setLessonScope",
]);

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function syncPack(lang, tMap, lMap) {
  const t = { ...tMap };
  for (const [key, en] of Object.entries(enT)) {
    if (SPURIOUS.has(key) || t[key]) continue;
    if (lMap[en]) t[key] = lMap[en];
  }
  return t;
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
  ["fr", frT, frL],
  ["de", deT, deL],
  ["ur", urT, urL],
  ["zh", zhT, zhL],
];

for (const [lang, tMap, lMap] of packs) {
  const t = syncPack(lang, tMap, lMap);
  const missing = Object.keys(enT).filter((k) => !SPURIOUS.has(k) && !t[k]);
  if (missing.length) {
    console.warn(`${lang}: still missing ${missing.length} t keys:`, missing.slice(0, 10).join(", "));
  }
  writeFileSync(join(root, `scripts/locale-packs/${lang}.mjs`), emitMjs(lang, t, lMap), "utf8");
  console.log(`${lang}.mjs: ${Object.keys(t).length} t keys`);
}
