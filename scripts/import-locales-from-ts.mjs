/**
 * Parse generated locale .ts files back into locale-packs/*.mjs source maps.
 * Run: node scripts/import-locales-from-ts.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseTsExport(content, exportName) {
  const re = new RegExp(`export const ${exportName}: Record<string, string> = \\{([\\s\\S]*?)\\n\\};`, "m");
  const m = content.match(re);
  if (!m) throw new Error(`Could not parse ${exportName}`);
  const block = m[1];
  const out = {};
  const entryRe = /^\s*(?:([A-Za-z_][\w]*)|"((?:\\.|[^"\\])*)"):\s*"((?:\\.|[^"\\])*)",?\s*$/gm;
  let em;
  while ((em = entryRe.exec(block))) {
    const key = em[1] ?? em[2];
    out[key] = em[3].replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }
  return out;
}

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
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

for (const lang of ["fr", "de", "ur", "zh"]) {
  const content = readFileSync(join(root, `src/lib/i18n/locales/${lang}.ts`), "utf8");
  const tMap = parseTsExport(content, lang);
  const lMap = parseTsExport(content, `${lang}ByEn`);
  writeFileSync(join(root, `scripts/locale-packs/${lang}.mjs`), emitMjs(lang, tMap, lMap), "utf8");
  console.log(`${lang}.mjs: ${Object.keys(tMap).length} t, ${Object.keys(lMap).length} L`);
}
