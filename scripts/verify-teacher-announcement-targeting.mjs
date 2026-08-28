/**
 * READ-ONLY production catalog verification for teacher announcement targeting RLS.
 * Uses Supabase Management API database/query (SELECT / catalog inspection only).
 *
 * Requires: SUPABASE_ACCESS_TOKEN
 * Project:  aijukbdxyawxzekwhrdo (override via SUPABASE_PROJECT_ID)
 */
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

const functions = await q(`
  SELECT
    p.proname,
    pg_get_function_identity_arguments(p.oid) AS args,
    pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'teacher_can_manage_article_target',
      'teacher_owns_article_row'
    )
  ORDER BY p.proname;
`);

const allArticlePolicies = await q(`
  SELECT
    policyname,
    cmd,
    roles::text AS roles,
    qual,
    with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'articles'
  ORDER BY cmd, policyname;
`);

const teacherMutationPolicies = await q(`
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'articles'
    AND policyname IN (
      'articles_teacher_insert',
      'articles_teacher_update',
      'articles_teacher_delete',
      'articles_teacher_select'
    )
  ORDER BY policyname;
`);

const updateDeletePolicies = await q(`
  SELECT policyname, cmd, roles::text AS roles, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'articles'
    AND cmd IN ('UPDATE', 'DELETE', '*')
  ORDER BY cmd, policyname;
`);

const rlsState = await q(`
  SELECT
    c.relname,
    c.relrowsecurity,
    c.relforcerowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'articles';
`);

const metadataTrigger = await q(`
  SELECT
    t.tgname,
    p.proname AS function_name,
    t.tgenabled,
    pg_get_triggerdef(t.oid, true) AS trigger_def
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE n.nspname = 'public'
    AND c.relname = 'articles'
    AND NOT t.tgisinternal
    AND p.proname = 'articles_protect_metadata';
`);

const metadataFunction = await q(`
  SELECT pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'articles_protect_metadata';
`);

const leadBypassInMutation = await q(`
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'articles'
    AND policyname LIKE 'articles_teacher_%'
    AND cmd IN ('UPDATE', 'DELETE')
    AND (
      coalesce(qual, '') ILIKE '%teacher_is_lead_teacher%'
      OR coalesce(with_check, '') ILIKE '%teacher_is_lead_teacher%'
    );
`);

const broadTeacherMutation = await q(`
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'articles'
    AND policyname LIKE '%teacher%'
    AND cmd IN ('INSERT', 'UPDATE', 'DELETE', '*')
  ORDER BY policyname;
`);

const verificationSql = readFileSync(
  resolve(__dirname, "../supabase/manual/verify_teacher_announcement_targeting_rls.sql"),
  "utf8",
);

console.log(
  JSON.stringify(
    {
      projectRef,
      verificationType: "CATALOG_READ_ONLY",
      runtimeImpersonation: false,
      functions,
      allArticlePolicies,
      teacherMutationPolicies,
      updateDeletePolicies,
      rlsState,
      metadataTrigger,
      metadataFunction,
      leadBypassInMutation,
      broadTeacherMutation,
      note: "Run verify_teacher_announcement_targeting_rls.sql separately in SQL Editor for matrix checks.",
    },
    null,
    2,
  ),
);
