/**
 * QA: student profile email + grade self-correction (fixtures/mocks only).
 * Run: node scripts/qa-student-profile-self-correction.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSubmitGuard,
  lessonVisibilityGrade,
  mapAuthEmailChangeError,
  simulateEmailChange,
  simulateGradeChange,
  validateStudentEmailChangeInput,
  validateStudentGradeChangeInput,
} from "./lib/student-profile-self-correction.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function testSourceWiring() {
  const profileRoute = readFileSync(join(root, "src/routes/student.profile.tsx"), "utf8");
  const lib = readFileSync(join(root, "src/lib/student-profile-self-correction.ts"), "utf8");
  const authConfig = readFileSync(join(root, "src/lib/auth-config.ts"), "utf8");

  assert.match(profileRoute, /changeStudentLoginEmail/);
  assert.match(profileRoute, /changeStudentGrade/);
  assert.match(profileRoute, /student_profile_email_confirm_dialog/);
  assert.match(profileRoute, /student_profile_grade_confirm_dialog/);
  assert.match(profileRoute, /submitInFlightRef/);
  assert.match(lib, /supabase\.auth\.updateUser\(\{\s*email:/);
  assert.match(lib, /\.from\("profiles"\)/);
  assert.match(lib, /email: confirmedEmail/);
  assert.ok(!authConfig.includes("import.meta.env.PROD ? true"), "email verification must stay OFF by default");
  console.log("PASS source wiring — profile self-correction hooks present");
}

function testEmailValidation() {
  assert.deepEqual(validateStudentEmailChangeInput("a@school.edu", "b@school.edu", "b@school.edu"), {
    ok: true,
    normalizedNew: "b@school.edu",
  });
  assert.equal(validateStudentEmailChangeInput("a@school.edu", "bad", "bad").errorKey, "invalid_email");
  assert.equal(validateStudentEmailChangeInput("a@school.edu", "a@school.edu", "a@school.edu").errorKey, "same_email");
  assert.equal(
    validateStudentEmailChangeInput("a@school.edu", "b@school.edu", "c@school.edu").errorKey,
    "mismatch",
  );
  assert.equal(mapAuthEmailChangeError({ code: "email_exists" }), "duplicate_email");
  console.log("PASS email validation + duplicate mapping");
}

function testEmailChangePreservesIdentity() {
  const registry = {
    authUsers: new Map([
      ["u1", { id: "u1", email: "old@school.edu" }],
      ["u2", { id: "u2", email: "other@school.edu" }],
    ]),
    profiles: new Map([
      ["u1", { user_id: "u1", email: "old@school.edu", parent_link_code: "IIA-ABC123", grade: "9" }],
      ["u2", { user_id: "u2", email: "other@school.edu", parent_link_code: "IIA-XYZ999", grade: "10" }],
    ]),
    roles: new Map([
      ["u1", "student"],
      ["u2", "student"],
    ]),
    quizSubmissions: new Map([["u1", [{ id: "sub1" }]]]),
    certificates: new Map([["u1", [{ id: "cert1" }]]]),
  };

  const ok = simulateEmailChange(registry, "u1", "old@school.edu", "new@school.edu", "new@school.edu");
  assert.equal(ok.ok, true);
  assert.equal(ok.userId, "u1");
  assert.equal(ok.parentLinkCode, "IIA-ABC123");
  assert.equal(ok.role, "student");
  assert.equal(registry.authUsers.get("u1").email, "new@school.edu");
  assert.equal(registry.profiles.get("u1").email, "new@school.edu");

  const dup = simulateEmailChange(registry, "u1", "new@school.edu", "other@school.edu", "other@school.edu");
  assert.equal(dup.errorKey, "duplicate_email");
  console.log("PASS email change preserves user_id, role, parent_link_code");
}

function testGradeChange() {
  const registry = {
    authUsers: new Map([["u1", { id: "u1", email: "s@school.edu" }]]),
    profiles: new Map([
      ["u1", { user_id: "u1", email: "s@school.edu", parent_link_code: "IIA-KEEP01", grade: "9", section: "A", islamic_group: "B" }],
    ]),
    roles: new Map([["u1", "student"]]),
    quizSubmissions: new Map([["u1", [{ id: "q1" }, { id: "q2" }]]]),
    certificates: new Map([["u1", [{ id: "c1" }]]]),
  };

  const ok = simulateGradeChange(registry, "u1", "9", "10");
  assert.equal(ok.ok, true);
  assert.equal(ok.grade, "10");
  assert.equal(ok.parentLinkCode, "IIA-KEEP01");
  assert.equal(ok.quizSubmissionsPreserved, 2);
  assert.equal(ok.certificatesPreserved, 1);
  assert.equal(registry.profiles.get("u1").section, "A");
  assert.equal(registry.profiles.get("u1").islamic_group, "B");
  assert.equal(lessonVisibilityGrade("10", "10"), true);
  assert.equal(lessonVisibilityGrade("10", "9"), false);
  assert.equal(validateStudentGradeChangeInput("10", "10").errorKey, "same_grade");
  assert.equal(validateStudentGradeChangeInput("9", "bad-grade").errorKey, "invalid_grade");
  console.log("PASS grade 9→10 updates visibility inputs and preserves history");
}

function testDoubleSubmitGuard() {
  const guard = createSubmitGuard();
  assert.deepEqual(guard.trySubmit(), { accepted: true });
  assert.deepEqual(guard.trySubmit(), { accepted: false, reason: "in_flight" });
  guard.finish();
  assert.deepEqual(guard.trySubmit(), { accepted: true });
  guard.finish();
  console.log("PASS double-submit guard");
}

testSourceWiring();
testEmailValidation();
testEmailChangePreservesIdentity();
testGradeChange();
testDoubleSubmitGuard();

console.log("qa-student-profile-self-correction: all checks passed");
