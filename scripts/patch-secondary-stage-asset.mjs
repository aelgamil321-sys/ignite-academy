import fs from "node:fs";
import path from "node:path";

const indexPath = path.join(".output", "server", "index.mjs");
const unicodeKey = '"/images/الثانوية.jpg"';
const encodedKey = `"/images/${encodeURIComponent("الثانوية.jpg")}"`;

if (!fs.existsSync(indexPath)) {
  console.warn("[patch-secondary-stage-asset] Skipping: build output not found.");
  process.exit(0);
}

let content = fs.readFileSync(indexPath, "utf8");

if (!content.includes(unicodeKey)) {
  console.warn("[patch-secondary-stage-asset] Skipping: Unicode asset key not found.");
  process.exit(0);
}

if (content.includes(encodedKey)) {
  console.log("[patch-secondary-stage-asset] Encoded alias already present.");
  process.exit(0);
}

const blockPattern = /"\/images\/الثانوية\.jpg":\s*\{[\s\S]*?\n  \}/;
const match = content.match(blockPattern);

if (!match) {
  console.warn("[patch-secondary-stage-asset] Skipping: asset block not found.");
  process.exit(0);
}

const aliasBlock = match[0].replace(unicodeKey, encodedKey);
content = content.replace(match[0], `${aliasBlock},\n  ${match[0]}`);
fs.writeFileSync(indexPath, content);
console.log("[patch-secondary-stage-asset] Added percent-encoded asset alias.");
