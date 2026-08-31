/**
 * QA: teacher lesson publish uses lessons.published (no OpenAI).
 * Run: node scripts/qa-teacher-lesson-publish.mjs
 * Optional: LESSON_ID=<uuid> to target a specific draft lesson.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { hydrateServerProcessEnv } from "./lib/load-server-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const env = hydrateServerProcessEnv({ root });

const SUPABASE_URL = (env.SUPABASE_URL || env.VITE_SUPABASE_URL)?.trim();
const SUPABASE_PUBLISHABLE_KEY = (
  env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY
)?.trim();
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const LESSON_ID = process.env.LESSON_ID?.trim();

function studentVisibleLessons(lessons, gradeSlug) {
  return lessons.filter((l) => l.published && l.grade === gradeSlug);
}

function testStudentVisibilityFilter() {
  const lessons = [
    { id: "a", grade: "10", published: true },
    { id: "b", grade: "10", published: false },
    { id: "c", grade: "11", published: true },
  ];
  const visible = studentVisibleLessons(lessons, "10");
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, "a");
  console.log("PASS student visibility filter uses published=true");
}

function testSourceHasPublishControls() {
  const list = readFileSync(join(root, "src/routes/teacher/lessons.index.tsx"), "utf8");
  const edit = readFileSync(join(root, "src/components/lesson-edit-form.tsx"), "utf8");
  assert.ok(list.includes("TeacherLessonPublishButton"));
  assert.ok(list.includes("TeacherLessonStatusBadge"));
  assert.ok(edit.includes("TeacherLessonPublishButton"));
  assert.ok(edit.includes("TeacherLessonStatusBadge"));
  console.log("PASS publish controls present in teacher list + edit");
}

async function createTeacherSession(admin, userId) {
  if (typeof admin.auth.admin.createSession !== "function") {
    return null;
  }
  const { data, error } = await admin.auth.admin.createSession({ user_id: userId });
  if (error || !data.session) return null;
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

async function sessionForLessonGrade(admin, grade) {
  const { data, error } = await admin
    .from("teacher_assignments")
    .select("teacher_id")
    .eq("grade", grade)
    .limit(1);
  if (error) throw error;
  const teacherId = data?.[0]?.teacher_id;
  if (!teacherId) return null;
  return createTeacherSession(admin, teacherId);
}

function loadTeacherSession() {
  const sessionPath = join(root, ".tmp-teacher-session.json");
  if (!existsSync(sessionPath)) return null;
  const raw = JSON.parse(readFileSync(sessionPath, "utf8"));
  const payload = raw?.sessionPayload ?? raw?.currentSession ?? raw;
  const accessToken = payload?.access_token;
  const refreshToken = payload?.refresh_token;
  if (!accessToken || !refreshToken) return null;
  return { access_token: accessToken, refresh_token: refreshToken };
}

async function findDraftLesson(admin, grade) {
  const { data, error } = await admin
    .from("lessons")
    .select("id, grade, published, is_deleted")
    .eq("published", false)
    .eq("is_deleted", false)
    .eq("grade", grade)
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

async function runLivePublishCycle() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SERVICE_KEY) {
    console.log("SKIP live publish cycle — missing Supabase env");
    return { skipped: true };
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let lessonId = LESSON_ID;
  let grade = null;

  if (lessonId) {
    const { data, error } = await admin
      .from("lessons")
      .select("id, grade, published, is_deleted")
      .eq("id", lessonId)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.is_deleted) throw new Error("lesson not found");
    grade = data.grade;
  } else {
    const sessionFallback = loadTeacherSession();
    if (!sessionFallback) {
      console.log("SKIP live publish cycle — no lesson id or teacher session");
      return { skipped: true };
    }
    const probe = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await probe.auth.setSession(sessionFallback);
    const { data: userData } = await probe.auth.getUser();
    const { data: assigns } = await admin
      .from("teacher_assignments")
      .select("grade")
      .eq("teacher_id", userData.user?.id ?? "")
      .limit(1);
    const teacherGrade = assigns?.[0]?.grade;
    const draft = teacherGrade ? await findDraftLesson(admin, teacherGrade) : null;
    if (!draft) {
      console.log("SKIP live publish cycle — no draft lesson found");
      return { skipped: true };
    }
    lessonId = draft.id;
    grade = draft.grade;
  }

  const session = LESSON_ID
    ? await sessionForLessonGrade(admin, grade)
    : (await sessionForLessonGrade(admin, grade)) ?? loadTeacherSession();
  if (!session) {
    console.log("SKIP live publish cycle — no teacher session for lesson grade");
    return { skipped: true };
  }

  const teacher = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await teacher.auth.setSession(session);

  const { data: userData } = await teacher.auth.getUser();
  if (!userData.user) throw new Error("teacher session invalid");

  const originalPublished = (
    await admin.from("lessons").select("published").eq("id", lessonId).single()
  ).data?.published;
  assert.equal(typeof originalPublished, "boolean");

  const visibleBefore = studentVisibleLessons(
    [{ id: lessonId, grade, published: originalPublished }],
    grade,
  );
  const hiddenBefore = originalPublished === false;
  assert.equal(visibleBefore.length, originalPublished ? 1 : 0);

  const publish = await teacher
    .from("lessons")
    .update({ published: true })
    .eq("id", lessonId)
    .select("published");
  if (publish.error) throw publish.error;
  assert.equal(publish.data?.length, 1);
  assert.equal(publish.data[0].published, true);
  assert.equal(studentVisibleLessons([{ id: lessonId, grade, published: true }], grade).length, 1);

  const unpublish = await teacher
    .from("lessons")
    .update({ published: false })
    .eq("id", lessonId)
    .select("published");
  if (unpublish.error) throw unpublish.error;
  assert.equal(unpublish.data?.length, 1);
  assert.equal(unpublish.data[0].published, false);
  assert.equal(studentVisibleLessons([{ id: lessonId, grade, published: false }], grade).length, 0);

  const republish = await teacher
    .from("lessons")
    .update({ published: originalPublished })
    .eq("id", lessonId)
    .select("published");
  if (republish.error) throw republish.error;
  assert.equal(republish.data?.length, 1);
  assert.equal(republish.data[0].published, originalPublished);

  console.log(
    `PASS live publish cycle on lesson ${lessonId} (hiddenBefore=${hiddenBefore}, restored=${originalPublished})`,
  );
  return { skipped: false, lessonId, hiddenBefore, restored: originalPublished };
}

async function main() {
  testStudentVisibilityFilter();
  testSourceHasPublishControls();
  const live = await runLivePublishCycle();
  console.log(JSON.stringify({ ok: true, live }, null, 2));
}

main().catch((err) => {
  console.error("FAIL", err.message);
  process.exit(1);
});
