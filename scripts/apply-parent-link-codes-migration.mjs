import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRef = process.env.SUPABASE_PROJECT_ID || "aijukbdxyawxzekwhrdo";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

const migrationPath = resolve(
  __dirname,
  "../supabase/migrations/20260616120000_parent_link_codes.sql",
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

console.log("Migration applied:", body || "OK");

const verify = await fetch(
  `https://${projectRef}.supabase.co/rest/v1/profiles?select=parent_link_code&limit=1`,
  {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  },
);

const verifyBody = await verify.text();
if (!verify.ok) {
  console.error(`Verification failed (${verify.status}):`, verifyBody);
  process.exit(1);
}

console.log("SUCCESS: parent_link_code column is available.");
