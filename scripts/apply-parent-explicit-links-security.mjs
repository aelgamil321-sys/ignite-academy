/**
 * Apply parent explicit-links security migration to production via Management API.
 * Applies ONLY: 20260829150000_parent_explicit_links_security.sql
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envPath = resolve(__dirname, "../.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const projectRef =
  process.env.SUPABASE_PROJECT_ID ||
  process.env.VITE_SUPABASE_PROJECT_ID ||
  "aijukbdxyawxzekwhrdo";
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.error("Missing SUPABASE_ACCESS_TOKEN. Cannot apply migration.");
  process.exit(1);
}

const migrationPath = resolve(
  __dirname,
  "../supabase/migrations/20260829150000_parent_explicit_links_security.sql",
);
const sql = readFileSync(migrationPath, "utf8");

async function q(query) {
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
  if (!response.ok) throw new Error(`${response.status} ${body}`);
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

console.log("--- Pre-flight: recent remote migrations ---");
const before = await q(`
  SELECT version, name
  FROM supabase_migrations.schema_migrations
  ORDER BY version DESC
  LIMIT 15;
`);
console.log(JSON.stringify(before, null, 2));

const preFn = await q(`
  SELECT pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'parent_can_read_student'
    AND pg_get_function_identity_arguments(p.oid) = 'target_student_id uuid';
`);
const preDef = preFn?.[0]?.definition ?? "";
const hasLegacy =
  preDef.includes("parent_matches_student_profile") ||
  preDef.includes("student_name") ||
  preDef.includes("student_grade");
console.log(`Pre-apply legacy fallback in parent_can_read_student: ${hasLegacy ? "YES" : "NO"}`);

if (!hasLegacy) {
  console.log("Migration appears already applied (no legacy fallback). Skipping DDL.");
  process.exit(0);
}

console.log("\nApplying 20260829150000_parent_explicit_links_security.sql ...");
const applyResult = await q(sql);
console.log("Apply response:", applyResult || "OK");

console.log("\nPost-apply verification (inline) ...");
const postFn = await q(`
  SELECT pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'parent_can_read_student'
    AND pg_get_function_identity_arguments(p.oid) = 'target_student_id uuid';
`);
const postDef = postFn?.[0]?.definition ?? "";
if (!postDef.includes("parent_student_links")) {
  console.error("FAIL: post-apply function missing parent_student_links reference");
  process.exit(1);
}
if (
  postDef.includes("parent_matches_student_profile") ||
  postDef.includes("student_name")
) {
  console.error("FAIL: legacy authorization still present after apply");
  process.exit(1);
}

console.log("SUCCESS: parent explicit-links security migration applied.");
