import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { frT, frL } from "./locale-packs/fr.mjs";
import { deT, deL } from "./locale-packs/de.mjs";
import { urT, urL } from "./locale-packs/ur.mjs";
import { zhT, zhL } from "./locale-packs/zh.mjs";
import { SPURIOUS_T_KEYS } from "./lib/i18n-qa-utils.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enT = JSON.parse(readFileSync(join(root, "scripts/en-t.json"), "utf8"));
const enL = JSON.parse(readFileSync(join(root, "scripts/en-l.json"), "utf8"));

const allTKeys = Object.keys(enT).filter((k) => !SPURIOUS_T_KEYS.has(k) && enT[k]?.trim());

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function emitTs(lang, tMap, lMap) {
  const tLines = allTKeys.map((k) => `  ${k}: "${esc(tMap[k])}",`);
  const lLines = enL.map((en) => `  "${esc(en)}": "${esc(lMap[en])}",`);
  return `/** ${lang.toUpperCase()} translations for GHIRAS UI. */
export const ${lang}: Record<string, string> = {
${tLines.join("\n")}
};

/** ${lang.toUpperCase()} translations for L() English strings. */
export const ${lang}ByEn: Record<string, string> = {
${lLines.join("\n")}
};
`;
}

function validate(lang, tMap, lMap) {
  const missingT = allTKeys.filter((k) => !tMap[k]);
  const missingL = enL.filter((en) => !lMap[en]);
  if (missingT.length) throw new Error(`${lang}: missing ${missingT.length} t keys: ${missingT.slice(0, 5).join(", ")}`);
  if (missingL.length) throw new Error(`${lang}: missing ${missingL.length} L strings: ${missingL.slice(0, 3).join(", ")}`);
}

const packs = [
  ["fr", frT, frL],
  ["de", deT, deL],
  ["ur", urT, urL],
  ["zh", zhT, zhL],
];

for (const [lang, tMap, lMap] of packs) {
  validate(lang, tMap, lMap);
  const out = join(root, `src/lib/i18n/locales/${lang}.ts`);
  writeFileSync(out, emitTs(lang, tMap, lMap), "utf8");
  console.log(`${lang}.ts: ${allTKeys.length} t keys, ${enL.length} L strings`);
}
