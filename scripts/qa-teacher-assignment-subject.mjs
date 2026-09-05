/**
 * QA: Islamic Education + Qur'an teacher assignment subject scope.
 * Run: node scripts/qa-teacher-assignment-subject.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_TEACHING_SUBJECT,
  migrationDefaultsExistingToIslamicEducation,
  normalizeTeachingSubjectType,
  studentLessonVisibleForGrade,
  teacherCanManageLessonScope,
  teacherLessonInScope,
} from "./lib/teacher-assignment-subject.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function testMigrationFile() {
  const migrationPath = join(
    root,
    "supabase/migrations/20260905120000_teacher_assignment_subject_type.sql",
  );
  assert.ok(existsSync(migrationPath), "migration file must exist");
  const sql = readFileSync(migrationPath, "utf8");
  assert.match(sql, /teacher_assignments[\s\S]*subject_type/);
  assert.match(sql, /DEFAULT 'islamic_education'/);
  assert.match(sql, /lessons[\s\S]*teaching_subject/);
  assert.match(sql, /teacher_can_manage_lesson_scope/);
  console.log("PASS migration file — subject_type + teaching_subject + scope helper");
}

function testExistingAssignmentsDefaultIslamic() {
  assert.equal(normalizeTeachingSubjectType(null), "islamic_education");
  assert.equal(normalizeTeachingSubjectType(undefined), "islamic_education");
  assert.equal(normalizeTeachingSubjectType(""), "islamic_education");
  assert.equal(normalizeTeachingSubjectType("bogus"), "islamic_education");
  assert.equal(migrationDefaultsExistingToIslamicEducation(), DEFAULT_TEACHING_SUBJECT);
  console.log("PASS existing assignments default to islamic_education");
}

function testIndependentSubjectAssignments() {
  const context = {
    isLeadTeacher: false,
    assignments: [
      { subject_type: "islamic_education", grade: "9", section: null, islamic_group: null },
      { subject_type: "islamic_education", grade: "10", section: null, islamic_group: null },
      { subject_type: "quran", grade: "8", section: "A", islamic_group: null },
    ],
  };

  assert.equal(teacherCanManageLessonScope(context, "9", "islamic_education"), true);
  assert.equal(teacherCanManageLessonScope(context, "10", "islamic_education"), true);
  assert.equal(teacherCanManageLessonScope(context, "8", "quran"), true);
  assert.equal(teacherCanManageLessonScope(context, "8", "islamic_education"), false);
  assert.equal(teacherCanManageLessonScope(context, "10", "quran"), false);
  console.log("PASS independent Islamic / Qur'an assignments");
}

function testSameGradeTwoSubjects() {
  const context = {
    isLeadTeacher: false,
    assignments: [
      { subject_type: "islamic_education", grade: "8", section: "A", islamic_group: "B" },
      { subject_type: "quran", grade: "8", section: "A", islamic_group: null },
    ],
  };

  assert.equal(teacherCanManageLessonScope(context, "8", "islamic_education"), true);
  assert.equal(teacherCanManageLessonScope(context, "8", "quran"), true);
  assert.equal(
    teacherLessonInScope(context, { grade: "8", teachingSubject: "islamic_education" }),
    true,
  );
  assert.equal(teacherLessonInScope(context, { grade: "8", teachingSubject: "quran" }), true);
  console.log("PASS same grade with two subject assignments");
}

function testUnauthorizedCrossSubjectWriteBlocked() {
  const context = {
    isLeadTeacher: false,
    assignments: [{ subject_type: "quran", grade: "8", section: null, islamic_group: null }],
  };
  assert.equal(teacherCanManageLessonScope(context, "10", "quran"), false);
  assert.equal(teacherCanManageLessonScope(context, "8", "islamic_education"), false);
  console.log("PASS unauthorized cross-subject lesson blocked");
}

function testLegacyLessonCompatibility() {
  const legacy = { published: true, grade: "10", teachingSubject: null };
  const islamic = { published: true, grade: "10", teachingSubject: "islamic_education" };
  assert.equal(studentLessonVisibleForGrade(legacy, "10"), true);
  assert.equal(studentLessonVisibleForGrade(islamic, "10"), true);
  assert.equal(studentLessonVisibleForGrade({ published: false, grade: "10" }, "10"), false);
  console.log("PASS legacy lesson student visibility preserved");
}

function testSourceWiring() {
  const adminUi = readFileSync(join(root, "src/components/admin-teacher-management.tsx"), "utf8");
  const classCard = readFileSync(join(root, "src/components/teacher-class-card.tsx"), "utf8");
  const lessonForm = readFileSync(join(root, "src/components/lesson-create-draft-form.tsx"), "utf8");
  const lessonNew = readFileSync(join(root, "src/routes/teacher/lessons.new.tsx"), "utf8");
  const studentsRoute = readFileSync(join(root, "src/routes/teacher/students.index.tsx"), "utf8");

  assert.match(adminUi, /SubjectAssignmentBlock/);
  assert.match(adminUi, /TEACHING_SUBJECT_TYPES/);
  assert.match(classCard, /teachingSubjectLabel/);
  assert.match(classCard, /subject_type: assignment.subject_type/);
  assert.match(lessonForm, /teaching_subject: teachingSubject/);
  assert.match(lessonForm, /allowedGradesBySubject/);
  assert.match(lessonNew, /teacherAssignedGradesForSubject/);
  assert.match(studentsRoute, /subject_type/);
  console.log("PASS source wiring — admin, My Classes, lesson create, students");
}

function testMyClassesLayoutFix() {
  const classCard = readFileSync(join(root, "src/components/teacher-class-card.tsx"), "utf8");
  assert.match(classCard, /flex flex-col gap-2 sm:grid sm:grid-cols-2/);
  assert.match(classCard, /truncate/);
  console.log("PASS My Classes button layout fix present");
}

function testI18nLabels() {
  const i18n = readFileSync(join(root, "src/lib/i18n.tsx"), "utf8");
  assert.match(i18n, /teacher_subject_islamic_education.*Islamic Education.*التربية الإسلامية/s);
  assert.match(i18n, /teacher_subject_quran.*Qur'an.*القرآن الكريم/s);
  console.log("PASS i18n subject labels");
}

function main() {
  testMigrationFile();
  testExistingAssignmentsDefaultIslamic();
  testIndependentSubjectAssignments();
  testSameGradeTwoSubjects();
  testUnauthorizedCrossSubjectWriteBlocked();
  testLegacyLessonCompatibility();
  testSourceWiring();
  testMyClassesLayoutFix();
  testI18nLabels();
  console.log("\nAll teacher assignment subject QA checks passed.");
}

main();
