import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRef = process.env.SUPABASE_PROJECT_ID || "aijukbdxyawxzekwhrdo";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

const migrationPath = resolve(
  __dirname,
  "../supabase/migrations/20260618120000_parent_link_codes_pgcrypto_fix.sql",
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
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        SELECT
          COUNT(*)::int AS total_profiles,
          COUNT(*) FILTER (
            WHERE parent_link_code IS NOT NULL AND trim(parent_link_code) <> ''
          )::int AS profiles_with_codes
        FROM public.profiles;
      `,
    }),
  },
);

console.log("Backfill verification:", await verify.text());
console.log("SUCCESS: pgcrypto fix migration applied.");
