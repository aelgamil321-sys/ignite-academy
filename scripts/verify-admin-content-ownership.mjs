import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
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

const tables = ["lessons", "assignments", "files", "videos", "unit_quizzes"];

const columns = await q(`
  SELECT table_name, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('lessons','assignments','files','videos','unit_quizzes','articles')
    AND column_name = 'created_by'
  ORDER BY table_name;
`);

const triggers = await q(`
  SELECT c.relname AS table_name, t.tgname AS trigger_name, p.proname AS function_name, t.tgenabled
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal
    AND (
      t.tgname LIKE '%stamp_created_by%'
      OR (c.relname = 'articles' AND p.proname = 'articles_protect_metadata')
    )
  ORDER BY c.relname, t.tgname;
`);

const nullCounts = await q(`
  SELECT 'lessons' AS table_name,
         count(*) FILTER (WHERE created_by IS NULL) AS null_created_by,
         count(*) FILTER (WHERE created_by IS NOT NULL) AS non_null_created_by,
         count(*) AS total
  FROM public.lessons
  UNION ALL
  SELECT 'assignments', count(*) FILTER (WHERE created_by IS NULL), count(*) FILTER (WHERE created_by IS NOT NULL), count(*) FROM public.assignments
  UNION ALL
  SELECT 'files', count(*) FILTER (WHERE created_by IS NULL), count(*) FILTER (WHERE created_by IS NOT NULL), count(*) FROM public.files
  UNION ALL
  SELECT 'videos', count(*) FILTER (WHERE created_by IS NULL), count(*) FILTER (WHERE created_by IS NOT NULL), count(*) FROM public.videos
  UNION ALL
  SELECT 'unit_quizzes', count(*) FILTER (WHERE created_by IS NULL), count(*) FILTER (WHERE created_by IS NOT NULL), count(*) FROM public.unit_quizzes
  UNION ALL
  SELECT 'articles', count(*) FILTER (WHERE created_by IS NULL), count(*) FILTER (WHERE created_by IS NOT NULL), count(*) FROM public.articles;
`);

const adminPolicies = await q(`
  SELECT schemaname, tablename, policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('lessons','assignments','articles','files','videos','unit_quizzes')
    AND (
      policyname ILIKE '%admin%'
      OR policyname ILIKE 'Admins%'
    )
  ORDER BY tablename, cmd, policyname;
`);

const broadBypass = await q(`
  SELECT tablename, policyname, cmd
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN ('lessons_admin_delete','unit_quizzes_admin_delete','assignments_admin_all')
  ORDER BY tablename, policyname;
`);

const teacherPolicies = await q(`
  SELECT tablename, policyname, cmd
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      policyname LIKE '%_teacher_%'
      OR policyname LIKE 'lessons_teacher_%'
      OR policyname LIKE 'assignments_teacher_%'
      OR policyname LIKE 'articles_teacher_%'
      OR policyname LIKE 'files_teacher_%'
      OR policyname LIKE 'videos_teacher_%'
      OR policyname LIKE 'unit_quizzes_teacher_%'
    )
  ORDER BY tablename, policyname;
`);

const storagePolicies = await q(`
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'lesson_files_%'
  ORDER BY policyname;
`);

const storageHelper = await q(`
  SELECT p.proname
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'lesson_id_from_lesson_files_path';
`);

const unrestrictedAdminWrites = await q(`
  SELECT tablename, policyname, cmd, qual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('lessons','assignments','articles','files','videos','unit_quizzes')
    AND cmd IN ('UPDATE','DELETE','ALL')
    AND (
      policyname ILIKE '%admin%'
      OR policyname ILIKE 'Admins%'
    )
    AND qual IS NOT NULL
    AND qual NOT ILIKE '%created_by%'
    AND qual NOT ILIKE '%auth.uid()%'
  ORDER BY tablename, policyname;
`);

console.log(
  JSON.stringify(
    {
      projectRef,
      columns,
      triggers,
      nullCounts,
      broadBypass,
      unrestrictedAdminWrites,
      adminPolicies,
      teacherPolicies,
      storagePolicies,
      storageHelper,
    },
    null,
    2,
  ),
);
