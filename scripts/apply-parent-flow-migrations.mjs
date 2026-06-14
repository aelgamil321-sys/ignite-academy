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

async function runQuery(query) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Query failed (${response.status}): ${body}`);
  }
  return body;
}

const migrations = [
  "20260615130000_parent_student_links.sql",
  "20260616120000_parent_link_codes.sql",
  "20260617120000_parent_link_codes_complete.sql",
  "20260618120000_parent_link_codes_pgcrypto_fix.sql",
];

for (const file of migrations) {
  const migrationPath = resolve(__dirname, `../supabase/migrations/${file}`);
  const sql = readFileSync(migrationPath, "utf8");
  console.log(`Applying ${file}...`);
  const result = await runQuery(sql);
  console.log(`Applied ${file}:`, result || "OK");
}

console.log("Verifying parent_link_code column...");
const columnCheck = await runQuery(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'parent_link_code';
`);
console.log("Column check:", columnCheck);

console.log("Verifying student codes backfill...");
const backfillCheck = await runQuery(`
  SELECT
    COUNT(*)::int AS total_profiles,
    COUNT(*) FILTER (
      WHERE parent_link_code IS NOT NULL AND trim(parent_link_code) <> ''
    )::int AS profiles_with_codes
  FROM public.profiles;
`);
console.log("Backfill check:", backfillCheck);

const rpcCheck = await fetch(
  `https://${projectRef}.supabase.co/rest/v1/rpc/get_my_parent_link_code`,
  {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  },
);
console.log(
  "RPC get_my_parent_link_code:",
  rpcCheck.status,
  (await rpcCheck.text()).slice(0, 160),
);

const redeemCheck = await fetch(
  `https://${projectRef}.supabase.co/rest/v1/rpc/redeem_parent_link_code`,
  {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_code: "IIA-INVALID" }),
  },
);
console.log(
  "RPC redeem_parent_link_code:",
  redeemCheck.status,
  (await redeemCheck.text()).slice(0, 160),
);

console.log("SUCCESS: Parent link code migrations applied and verified.");
