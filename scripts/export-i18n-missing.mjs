import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { frT, frL } from "./locale-packs/fr.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enT = JSON.parse(readFileSync(join(root, "scripts/en-t.json"), "utf8"));
const enL = JSON.parse(readFileSync(join(root, "scripts/en-l.json"), "utf8"));

const SPURIOUS = new Set([
  "en", "ar", "lang", "locale", "dir", "setLang", "toggle", "tr", "bi", "biMaybe",
  "contentTranslating", "translationUnavailable", "setLessonScope",
]);

const tKeys = Object.keys(enT).filter((k) => !SPURIOUS.has(k));
const missingT = tKeys.filter((k) => !frT[k]);
const missingL = enL.filter((s) => !frL[s]);

writeFileSync(
  join(root, "scripts/i18n-missing.json"),
  JSON.stringify({ missingT, missingL, missingTWithEn: Object.fromEntries(missingT.map((k) => [k, enT[k]])) }, null, 2),
);
console.log("missingT", missingT.length, "missingL", missingL.length);
