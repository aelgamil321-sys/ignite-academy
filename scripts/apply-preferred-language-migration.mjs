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

const migrationFile = "20260625120000_preferred_language.sql";
const migrationPath = resolve(__dirname, `../supabase/migrations/${migrationFile}`);
const sql = readFileSync(migrationPath, "utf8");

console.log(`Applying ${migrationFile}...`);
const result = await runQuery(sql);
console.log(`Applied ${migrationFile}:`, result || "OK");

console.log("Verifying preferred_language columns...");
const columnCheck = await runQuery(`
  SELECT table_name, column_name, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'parent_profiles')
    AND column_name = 'preferred_language'
  ORDER BY table_name;
`);
console.log("Column check:", columnCheck);
