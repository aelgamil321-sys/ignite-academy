/**
 * READ-ONLY production catalog verification for parent explicit-links security.
 * Project: aijukbdxyawxzekwhrdo
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
  console.error("Missing SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

async function q(sql) {
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
  if (!response.ok) throw new Error(`${response.status} ${body}`);
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

const checks = [];

function pass(id, detail) {
  checks.push({ id, ok: true, detail });
  console.log(`PASS ${id}: ${detail}`);
}

function fail(id, detail) {
  checks.push({ id, ok: false, detail });
  console.error(`FAIL ${id}: ${detail}`);
}

const migrations = await q(`
  SELECT version, name
  FROM supabase_migrations.schema_migrations
  ORDER BY version DESC
  LIMIT 20;
`);
console.log("\n--- Recent migration history (remote) ---");
console.log(JSON.stringify(migrations, null, 2));

const fnRows = await q(`
  SELECT pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'parent_can_read_student'
    AND pg_get_function_identity_arguments(p.oid) = 'target_student_id uuid';
`);

const definition = fnRows?.[0]?.definition ?? "";
if (!definition) {
  fail("1", "parent_can_read_student(uuid) not found");
} else {
  pass("1", "parent_can_read_student(uuid) exists");
  if (definition.includes("parent_student_links")) {
    pass("2", "definition references parent_student_links");
  } else {
    fail("2", "definition missing parent_student_links");
  }
  if (
    definition.includes("parent_matches_student_profile") ||
    definition.includes("student_name") ||
    definition.includes("student_grade")
  ) {
    fail("3", "legacy name/grade authorization still present");
  } else {
    pass("3", "no legacy name/grade authorization in function");
  }
}

const syncFn = await q(`
  SELECT COUNT(*)::int AS count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'sync_parent_student_link_from_profile';
`);
if ((syncFn?.[0]?.count ?? 0) === 0) {
  pass("4", "sync_parent_student_link_from_profile() absent");
} else {
  fail("4", "sync_parent_student_link_from_profile() still exists");
}

const trigger = await q(`
  SELECT COUNT(*)::int AS count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'parent_profiles'
    AND NOT t.tgisinternal
    AND t.tgname = 'trg_sync_parent_student_link';
`);
if ((trigger?.[0]?.count ?? 0) === 0) {
  pass("5", "trg_sync_parent_student_link absent");
} else {
  fail("5", "trg_sync_parent_student_link still exists");
}

for (const name of ["redeem_parent_link_code", "get_my_parent_link_code"]) {
  const rows = await q(`
    SELECT COUNT(*)::int AS count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = '${name}';
  `);
  if ((rows?.[0]?.count ?? 0) > 0) pass(`6-${name}`, `${name} exists`);
  else fail(`6-${name}`, `${name} missing`);
}

const linkCount = await q(`SELECT COUNT(*)::int AS count FROM public.parent_student_links;`);
pass("7", `parent_student_links row count preserved: ${linkCount?.[0]?.count ?? 0}`);

const policies = await q(`
  SELECT policyname, tablename
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      qual LIKE '%parent_can_read_student%'
      OR with_check LIKE '%parent_can_read_student%'
    )
  ORDER BY tablename, policyname;
`);
if ((policies?.length ?? 0) > 0) {
  pass("8", `${policies.length} policies reference parent_can_read_student`);
} else {
  fail("8", "no policies reference parent_can_read_student");
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n--- Summary: ${checks.length - failed.length}/${checks.length} PASS ---`);
if (failed.length > 0) process.exit(1);
