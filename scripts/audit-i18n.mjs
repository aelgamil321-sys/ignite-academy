import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { frT, frL } from "./locale-packs/fr.mjs";
import { deT, deL } from "./locale-packs/de.mjs";
import { urT, urL } from "./locale-packs/ur.mjs";
import { zhT, zhL } from "./locale-packs/zh.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enT = JSON.parse(readFileSync(join(root, "scripts/en-t.json"), "utf8"));
const enL = JSON.parse(readFileSync(join(root, "scripts/en-l.json"), "utf8"));

function audit(name, tMap, lMap) {
  const missingT = Object.keys(enT).filter((k) => !tMap[k]);
  const missingL = enL.filter((s) => !lMap[s]);
  return { name, missingT, missingL };
}

for (const [name, tMap, lMap] of [
  ["fr", frT, frL],
  ["de", deT, deL],
  ["ur", urT, urL],
  ["zh", zhT, zhL],
]) {
  const { missingT, missingL } = audit(name, tMap, lMap);
  console.log(`\n=== ${name} ===`);
  console.log(`missing t: ${missingT.length}`);
  if (missingT.length) console.log(missingT.join(", "));
  console.log(`missing L: ${missingL.length}`);
  if (missingL.length) console.log(missingL.slice(0, 50).join("\n"));
}
