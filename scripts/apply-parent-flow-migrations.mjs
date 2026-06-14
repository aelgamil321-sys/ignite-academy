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

const migrations = [
  "20260615130000_parent_student_links.sql",
  "20260616120000_parent_link_codes.sql",
  "20260617120000_parent_link_codes_complete.sql",
];

for (const file of migrations) {
  const migrationPath = resolve(__dirname, `../supabase/migrations/${file}`);
  const sql = readFileSync(migrationPath, "utf8");
  console.log(`Applying ${file}...`);

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
    console.error(`Migration failed for ${file} (${response.status}):`, body);
    process.exit(1);
  }
  console.log(`Applied ${file}:`, body || "OK");
}

const verify = await fetch(
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

console.log("RPC get_my_parent_link_code status:", verify.status, (await verify.text()).slice(0, 120));
console.log("SUCCESS: Parent link code migrations applied.");
