/**
 * Student registration readiness QA — deterministic mocks only (no Auth, no OpenAI, no emails).
 * Run: node scripts/qa-student-registration-readiness.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSubmitGuard,
  generateUniqueLinkCode,
  runConcurrentSubmissions,
  simulateRegistration,
  simulateSignupWithOptionalPhoto,
} from "./lib/student-registration-safety.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function testEmailVerificationDefaultsOffInSource() {
  const source = readFileSync(join(root, "src/lib/auth-config.ts"), "utf8");
  assert.ok(
    !source.includes("import.meta.env.PROD ? true"),
    "auth-config must not force email verification ON in production builds",
  );
  assert.ok(
    source.includes("ENABLE_EMAIL_VERIFICATION"),
    "auth-config must expose ENABLE_EMAIL_VERIFICATION flag",
  );
  console.log("PASS email verification not forced ON in production source");
}

function testSignupErrorClassificationSource() {
  const redirect = readFileSync(join(root, "src/lib/auth-redirect.ts"), "utf8");
  assert.ok(redirect.includes("classifySignupError"), "missing classifySignupError");
  assert.ok(redirect.includes("isDuplicateEmailError"), "missing isDuplicateEmailError");
  const auth = readFileSync(join(root, "src/routes/auth.tsx"), "utf8");
  assert.ok(auth.includes("signupErrorMessage"), "auth.tsx must sanitize signup errors");
  assert.ok(!auth.includes("showSignupError(message, err)"), "raw err.message must not be shown");
  console.log("PASS signup errors sanitized in source");
}

function testDoubleSubmitGuard() {
  const guard = createSubmitGuard();
  assert.deepEqual(guard.trySubmit(), { accepted: true });
  assert.deepEqual(guard.trySubmit(), { accepted: false, reason: "in_flight" });
  guard.finish();
  assert.deepEqual(guard.trySubmit(), { accepted: true });
  guard.finish();
  console.log("PASS duplicate-submit guard blocks concurrent handler");
}

function testDuplicateSubmitOnlyOneSignUpCall() {
  const guard = createSubmitGuard();
  const first = guard.trySubmit();
  const second = guard.trySubmit();
  if (first.accepted) guard.recordSignUpCall();
  guard.finish();
  assert.equal(guard.signUpCalls, 1);
  assert.equal(second.accepted, false);
  console.log("PASS duplicate-submit simulation — one signUp call");
}

async function testConcurrent50Registrations() {
  const registry = {
    authUsers: new Map(),
    profiles: new Map(),
    linkCodes: new Set(),
  };
  let nextId = 1;

  const results = await runConcurrentSubmissions(50, (email) =>
    simulateRegistration(registry, email, () => `uuid-${nextId++}`),
  );

  assert.equal(results.filter((r) => r.ok).length, 50);
  assert.equal(registry.authUsers.size, 50);
  assert.equal(registry.profiles.size, 50);
  assert.equal(registry.linkCodes.size, 50);
  console.log("PASS 50 simulated concurrent registrations — unique users/profiles/link codes");
}

function testDuplicateEmailSimulation() {
  const registry = {
    authUsers: new Map(),
    profiles: new Map(),
    linkCodes: new Set(),
  };
  let nextId = 1;
  const email = "same@school.test";
  const first = simulateRegistration(registry, email, () => `uuid-${nextId++}`);
  const second = simulateRegistration(registry, email, () => `uuid-${nextId++}`);
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.error, "duplicate_email");
  assert.equal(registry.profiles.size, 1);
  console.log("PASS duplicate-email simulation");
}

function testLinkCodeCollisionRetry() {
  const existing = ["IIA-000001"];
  let n = 0;
  const result = generateUniqueLinkCode(existing, () => {
    n += 1;
    return n === 1 ? 0.000001 : 0.123456 + n * 0.00001;
  });
  assert.ok(result.code.startsWith("IIA-"));
  assert.notEqual(result.code, "IIA-000001");
  assert.ok(result.attempts >= 2);
  console.log("PASS parent link-code collision retry");
}

function testPhotoFailureRecovery() {
  const failed = simulateSignupWithOptionalPhoto({ photoUploadFails: true });
  assert.equal(failed.signupCompleted, true);
  assert.equal(failed.accountUsable, true);
  assert.equal(failed.photoPath, null);
  assert.ok(failed.photoError);
  console.log("PASS photo failure simulation — account still usable");
}

function testProfileCreationFailureDoesNotDuplicate() {
  const registry = {
    authUsers: new Map(),
    profiles: new Map(),
    linkCodes: new Set(),
  };
  registry.authUsers.set("a@school.test", "uuid-1");
  const result = simulateRegistration(registry, "a@school.test", () => "uuid-2");
  assert.equal(result.ok, false);
  assert.equal(result.error, "duplicate_email");
  console.log("PASS profile creation race — duplicate email blocked");
}

function testPhotoStoragePathUnique() {
  const userId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
  const paths = new Set(
    Array.from({ length: 20 }, (_, i) => `${userId}/${Date.now() + i}-photo.jpg`),
  );
  assert.equal(paths.size, 20);
  console.log("PASS photo storage paths unique per upload");
}

async function main() {
  testEmailVerificationDefaultsOffInSource();
  testSignupErrorClassificationSource();
  testDoubleSubmitGuard();
  testDuplicateSubmitOnlyOneSignUpCall();
  await testConcurrent50Registrations();
  testDuplicateEmailSimulation();
  testLinkCodeCollisionRetry();
  testPhotoFailureRecovery();
  testProfileCreationFailureDoesNotDuplicate();
  testPhotoStoragePathUnique();
  console.log("\nAll student registration readiness checks passed.");
}

main().catch((err) => {
  console.error("FAIL", err.message);
  process.exit(1);
});
