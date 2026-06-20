import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRef = process.env.SUPABASE_PROJECT_ID || "aijukbdxyawxzekwhrdo";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!accessToken && !serviceRoleKey) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const migrationPath = resolve(
  __dirname,
  "../supabase/migrations/20260614120000_parent_accounts.sql",
);
const sql = readFileSync(migrationPath, "utf8");

async function runViaManagementApi() {
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
    throw new Error(`Management API failed (${response.status}): ${body}`);
  }
  return body;
}

async function verifyTable() {
  const key = serviceRoleKey || accessToken;
  const response = await fetch(
    `https://${projectRef}.supabase.co/rest/v1/parent_profiles?select=id&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey || process.env.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${key}`,
      },
    },
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Verification failed (${response.status}): ${body}`);
  }
  return true;
}

try {
  if (accessToken) {
    console.log("Applying migration via Supabase Management API...");
    const result = await runViaManagementApi();
    console.log("Migration response:", result || "OK");
  } else {
    console.log("SUPABASE_ACCESS_TOKEN not set; skipping Management API apply.");
    console.log("Set SUPABASE_ACCESS_TOKEN to apply DDL automatically.");
    process.exit(2);
  }

  console.log("Verifying parent_profiles table...");
  await verifyTable();
  console.log("SUCCESS: parent_profiles table is available.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
