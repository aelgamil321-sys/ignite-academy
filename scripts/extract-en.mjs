import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const s = readFileSync(join(root, "src/lib/i18n.tsx"), "utf8");
const keys = [...s.matchAll(/^  (\w+):/gm)].map((m) => m[1]);
const en = {};
for (const k of keys) {
  const blockRe = new RegExp(`  ${k}:\\s*\\{[\\s\\S]*?en:\\s*"((?:[^"\\\\]|\\\\.)*)"`, "m");
  const m = s.match(blockRe);
  en[k] = m ? m[1].replace(/\\"/g, '"') : "";
}
const l = JSON.parse(readFileSync(join(root, "scripts/l-strings-en.json"), "utf8"));
writeFileSync(join(root, "scripts/en-t.json"), JSON.stringify(en, null, 2));
writeFileSync(join(root, "scripts/en-l.json"), JSON.stringify(l, null, 2));
console.log("t", Object.keys(en).length, "l", l.length);
