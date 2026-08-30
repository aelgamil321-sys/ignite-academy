/**
 * Sync Nitro client assets into dist/client for Wrangler ASSETS binding.
 * Vite/Nitro writes static files to .output/public; wrangler.jsonc serves dist/client.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, ".output", "public");
const targetDir = path.join(root, "dist", "client");

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(sourceDir)) {
  console.error("[sync-dist-client] Missing build output:", sourceDir);
  process.exit(1);
}

if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}

copyRecursive(sourceDir, targetDir);

const assetCount = fs.existsSync(path.join(targetDir, "assets"))
  ? fs.readdirSync(path.join(targetDir, "assets")).length
  : 0;

if (assetCount === 0) {
  console.error("[sync-dist-client] No assets copied to dist/client/assets");
  process.exit(1);
}

console.log(`[sync-dist-client] Synced ${assetCount} files to dist/client/assets`);
