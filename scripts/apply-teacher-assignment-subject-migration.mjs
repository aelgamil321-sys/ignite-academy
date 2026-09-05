/**
 * Apply ONLY Phase 4.2 teacher assignment subject migration to local dev Supabase.
 * Usage: node scripts/apply-teacher-assignment-subject-migration.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { hydrateServerProcessEnv } from "./lib/load-server-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const env = hydrateServerProcessEnv({ root, hydrateProcessEnv: true });

const projectRef = env.SUPABASE_PROJECT_ID || "aijukbdxyawxzekwhrdo";
const accessToken = env.SUPABASE_ACCESS_TOKEN;

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

const migrationFile = "20260905120000_teacher_assignment_subject_type.sql";
const migrationPath = resolve(__dirname, `../supabase/migrations/${migrationFile}`);
const sql = readFileSync(migrationPath, "utf8");

console.log(`Applying ${migrationFile} to project ${projectRef}...`);
const result = await runQuery(sql);
console.log(`Applied ${migrationFile}:`, result || "OK");

console.log("Verifying columns...");
const columnCheck = await runQuery(`
  SELECT table_name, column_name, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND (
      (table_name = 'teacher_assignments' AND column_name = 'subject_type')
      OR (table_name = 'lessons' AND column_name = 'teaching_subject')
    )
  ORDER BY table_name;
`);
console.log("Columns:", columnCheck);

console.log("Verifying function...");
const fnCheck = await runQuery(`
  SELECT proname
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND proname = 'teacher_can_manage_lesson_scope';
`);
console.log("Function:", fnCheck);

console.log("Verifying lessons RLS policy...");
const policyCheck = await runQuery(`
  SELECT polname, cmd
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'lessons'
    AND polname LIKE 'lessons_teacher_%'
  ORDER BY polname;
`);
console.log("Policies:", policyCheck);
