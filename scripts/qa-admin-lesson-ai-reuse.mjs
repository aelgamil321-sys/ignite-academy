/**
 * QA: Admin Add Lesson reuses the same AI create/edit flow as teacher (no OpenAI).
 * Run: node scripts/qa-admin-lesson-ai-reuse.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const adminRoute = read("src/routes/admin.tsx");
const adminEdit = read("src/routes/admin.lessons.edit.$lessonId.tsx");
const adminNew = read("src/components/admin-new-lesson.tsx");
const sharedCreate = read("src/components/lesson-create-draft-form.tsx");
const teacherNew = read("src/routes/teacher/lessons.new.tsx");
const lessonEdit = read("src/components/lesson-edit-form.tsx");

assert.match(adminRoute, /tab === "new-lesson" && <AdminNewLesson \/>/);
assert.doesNotMatch(adminRoute, /tab === "new-lesson" && <LessonForm/);
assert.doesNotMatch(adminRoute, /function LessonForm/);

assert.match(adminNew, /LessonCreateDraftForm/);
assert.match(adminNew, /grades\.map\(\(g\) => g\.slug\)/);
assert.match(adminNew, /editTo="\/admin\/lessons\/edit\/\$lessonId"/);

assert.match(teacherNew, /LessonCreateDraftForm/);
assert.match(teacherNew, /fetchTeacherContext/);
assert.match(teacherNew, /editTo="\/teacher\/lessons\/edit\/\$lessonId"/);

assert.match(sharedCreate, /validateLessonMainFileForCreate/);
assert.match(sharedCreate, /CREATE_MAIN_LESSON_FILE_ACCEPT/);
assert.doesNotMatch(sharedCreate, /generate-lesson-from-file/);

assert.match(adminEdit, /lessonHasSavedAiGeneratedContent/);
assert.match(adminEdit, /hasMainLessonFile/);
assert.match(adminEdit, /formMode=\{/);
assert.match(adminEdit, /"simplified"/);

assert.match(lessonEdit, /LessonAiGeneratePanel/);
assert.match(lessonEdit, /lesson-ai-generate-panel/);

console.log("qa-admin-lesson-ai-reuse: all checks passed");
