import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadServerEnv } from "./lib/load-server-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadServerEnv({ root: resolve(__dirname, ".."), hydrateProcessEnv: true });

const projectRef = process.env.SUPABASE_PROJECT_ID || "aijukbdxyawxzekwhrdo";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

const migrationPath = resolve(
  __dirname,
  "../supabase/migrations/20260906173000_hall_of_fame_english_display_names.sql",
);
const sql = readFileSync(migrationPath, "utf8");

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);

const body = await response.text();
if (!response.ok) {
  console.error(`Migration failed (${response.status}):`, body);
  process.exit(1);
}

console.log("Hall of Fame English display names migration applied:", body || "OK");
