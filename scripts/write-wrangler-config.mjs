import fs from "node:fs";
import path from "node:path";

const serverDir = path.join(".output", "server");
const wranglerPath = path.join(serverDir, "wrangler.json");

if (!fs.existsSync(path.join(serverDir, "index.mjs"))) {
  console.warn("[write-wrangler-config] Skipping: .output/server/index.mjs not found.");
  process.exit(0);
}

const config = {
  $schema: "../../node_modules/wrangler/config-schema.json",
  name: "ignite-academy",
  compatibility_date: "2024-09-23",
  compatibility_flags: ["nodejs_compat"],
  main: "index.mjs",
  assets: {
    directory: "../public",
    binding: "ASSETS",
  },
};

fs.writeFileSync(wranglerPath, `${JSON.stringify(config, null, 2)}\n`);
console.log("[write-wrangler-config] Wrote .output/server/wrangler.json");
