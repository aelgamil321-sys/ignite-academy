import fs from "node:fs";
import path from "node:path";

const unicodeFilename = "الثانوية.jpg";
const asciiFilename = "_secondary-stage.jpg";
const unicodeKey = `"/images/${unicodeFilename}"`;
const encodedKey = `"/images/${encodeURIComponent(unicodeFilename)}"`;
const asciiAssetPath = `../public/images/${asciiFilename}`;

const publicDir = path.join("public", "images");
const outputPublicDir = path.join(".output", "public", "images");
const indexPath = path.join(".output", "server", "index.mjs");

const sourcePath = path.join(publicDir, unicodeFilename);

if (!fs.existsSync(sourcePath)) {
  console.warn("[patch-secondary-stage-asset] Skipping: source image not found.");
  process.exit(0);
}

if (!fs.existsSync(indexPath)) {
  console.warn("[patch-secondary-stage-asset] Skipping: build output not found.");
  process.exit(0);
}

fs.mkdirSync(outputPublicDir, { recursive: true });
fs.copyFileSync(sourcePath, path.join(publicDir, asciiFilename));
fs.copyFileSync(sourcePath, path.join(outputPublicDir, asciiFilename));

let content = fs.readFileSync(indexPath, "utf8");

if (!content.includes(unicodeKey)) {
  console.warn("[patch-secondary-stage-asset] Skipping: Unicode asset key not found.");
  process.exit(0);
}

const blockPattern = /"\/images\/الثانوية\.jpg":\s*\{[\s\S]*?\n  \}/;
const match = content.match(blockPattern);

if (!match) {
  console.warn("[patch-secondary-stage-asset] Skipping: asset block not found.");
  process.exit(0);
}

const patchedBlock = match[0].replace(
  /"path":\s*"[^"]+"/,
  `"path": "${asciiAssetPath}"`,
);

const encodedBlock = patchedBlock.replace(unicodeKey, encodedKey);

if (!content.includes(encodedKey)) {
  content = content.replace(match[0], `${encodedBlock},\n  ${patchedBlock}`);
} else {
  content = content.replace(match[0], patchedBlock);
}

fs.writeFileSync(indexPath, content);
console.log("[patch-secondary-stage-asset] Registered secondary stage image aliases.");
