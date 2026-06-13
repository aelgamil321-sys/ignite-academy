import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const unicodeFilename = "الثانوية.jpg";
const asciiFilename = "_secondary-stage.jpg";
const unicodeKey = `"/images/${unicodeFilename}"`;
const encodedKey = `"/images/${encodeURIComponent(unicodeFilename)}"`;
const asciiAssetPath = `../public/images/${asciiFilename}`;
const asciiPublicPath = `/images/${asciiFilename}`;

const assetFetchSnippet =
  'if (env.ASSETS && isPublicAssetURL(url.pathname)) {\n    return env.ASSETS.fetch(cfRequest);\n  }';

const assetFetchPatch = `if (env.ASSETS) {
    const secondaryPaths = new Set(["/images/${unicodeFilename}", "/images/${encodeURIComponent(unicodeFilename)}"]);
    let assetPath = url.pathname;
    if (secondaryPaths.has(assetPath)) {
      assetPath = "${asciiPublicPath}";
    }
    if (isPublicAssetURL(assetPath)) {
      const assetRequest = assetPath === url.pathname ? cfRequest : new Request(new URL(assetPath + url.search, url.origin), cfRequest);
      return env.ASSETS.fetch(assetRequest);
    }
  }`;

export function patchSecondaryStageAsset() {
  const publicDir = path.join("public", "images");
  const outputPublicDir = path.join(".output", "public", "images");
  const indexPath = path.join(".output", "server", "index.mjs");
  const sourcePath = path.join(publicDir, unicodeFilename);
  const asciiSourcePath = path.join(publicDir, asciiFilename);

  if (!fs.existsSync(indexPath)) {
    console.warn("[patch-secondary-stage-asset] Skipping: build output not found.");
    return;
  }

  const imageSource = fs.existsSync(sourcePath)
    ? sourcePath
    : fs.existsSync(asciiSourcePath)
      ? asciiSourcePath
      : null;

  if (!imageSource) {
    console.warn("[patch-secondary-stage-asset] Skipping: secondary stage image not found.");
    return;
  }

  fs.mkdirSync(outputPublicDir, { recursive: true });
  fs.copyFileSync(imageSource, path.join(outputPublicDir, asciiFilename));

  let content = fs.readFileSync(indexPath, "utf8");
  let patched = false;

  if (content.includes(assetFetchSnippet)) {
    content = content.replace(assetFetchSnippet, assetFetchPatch);
    patched = true;
  }

  const blockPattern = /"\/images\/الثانوية\.jpg":\s*\{[\s\S]*?\n  \}/;
  const match = content.match(blockPattern);

  if (match) {
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
    patched = true;
  } else if (!content.includes(encodedKey)) {
    const secondaryAssetBlock = `  ${encodedKey}: {
    "type": "image/jpeg",
    "path": "${asciiAssetPath}"
  },
  ${unicodeKey}: {
    "type": "image/jpeg",
    "path": "${asciiAssetPath}"
  }`;

    content = content.replace(
      /(\nconst publicAssetBases = \{\};)/,
      `,\n${secondaryAssetBlock}$1`,
    );
    patched = true;
  }

  if (!patched) {
    console.warn("[patch-secondary-stage-asset] Skipping: nothing to patch.");
    return;
  }

  fs.writeFileSync(indexPath, content);
  console.log("[patch-secondary-stage-asset] Patched secondary stage asset routing.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  patchSecondaryStageAsset();
}
