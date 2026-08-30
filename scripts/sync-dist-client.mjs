/**
 * Sync Nitro build output into dist/ for Wrangler.
 * - .output/public -> dist/client (ASSETS binding)
 * - .output/server -> dist/server (Worker entry), rewriting ../public/ -> ../client/
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicSource = path.join(root, ".output", "public");
const serverSource = path.join(root, ".output", "server");
const clientTarget = path.join(root, "dist", "client");
const serverTarget = path.join(root, "dist", "server");

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

function rewriteServerPublicPaths(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      rewriteServerPublicPaths(entryPath);
      continue;
    }
    if (!entry.name.endsWith(".mjs")) continue;
    const content = fs.readFileSync(entryPath, "utf8");
    const next = content.replaceAll("../public/", "../client/");
    if (next !== content) {
      fs.writeFileSync(entryPath, next);
    }
  }
}

if (!fs.existsSync(publicSource)) {
  console.error("[sync-dist-client] Missing build output:", publicSource);
  process.exit(1);
}

if (!fs.existsSync(serverSource)) {
  console.error("[sync-dist-client] Missing build output:", serverSource);
  process.exit(1);
}

if (fs.existsSync(clientTarget)) {
  fs.rmSync(clientTarget, { recursive: true, force: true });
}
if (fs.existsSync(serverTarget)) {
  fs.rmSync(serverTarget, { recursive: true, force: true });
}

copyRecursive(publicSource, clientTarget);
copyRecursive(serverSource, serverTarget);
rewriteServerPublicPaths(serverTarget);

const assetCount = fs.existsSync(path.join(clientTarget, "assets"))
  ? fs.readdirSync(path.join(clientTarget, "assets")).length
  : 0;

if (assetCount === 0) {
  console.error("[sync-dist-client] No assets copied to dist/client/assets");
  process.exit(1);
}

console.log(`[sync-dist-client] Synced ${assetCount} client assets and dist/server bundle`);
