/**
 * Pure helpers mirrored from src/lib/student-profile-self-correction.ts (no Supabase).
 */

export const STUDENT_GRADE_SLUGS = [
  "kg1",
  "kg2",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

const SLUG_ALIASES = {
  "grade-9": "9",
  "grade 9": "9",
  "grade-10": "10",
  "grade 10": "10",
};

export function normalizeStudentEmailInput(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function isValidStudentEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeGradeSlug(value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const lower = v.toLowerCase();
  if (SLUG_ALIASES[lower]) return SLUG_ALIASES[lower];
  if (STUDENT_GRADE_SLUGS.includes(v)) return v;
  return v;
}

export function validateStudentEmailChangeInput(currentEmail, newEmail, confirmEmail) {
  const normalizedCurrent = normalizeStudentEmailInput(currentEmail);
  const normalizedNew = normalizeStudentEmailInput(newEmail);
  const normalizedConfirm = normalizeStudentEmailInput(confirmEmail);

  if (!normalizedNew) return { ok: false, errorKey: "empty" };
  if (!isValidStudentEmailFormat(normalizedNew)) return { ok: false, errorKey: "invalid_email" };
  if (normalizedNew === normalizedCurrent) return { ok: false, errorKey: "same_email" };
  if (normalizedNew !== normalizedConfirm) return { ok: false, errorKey: "mismatch" };
  return { ok: true, normalizedNew };
}

export function validateStudentGradeChangeInput(currentGrade, newGrade) {
  const normalizedGrade = normalizeGradeSlug(newGrade);
  if (!normalizedGrade) return { ok: false, errorKey: "empty" };
  if (!STUDENT_GRADE_SLUGS.includes(normalizedGrade)) return { ok: false, errorKey: "invalid_grade" };
  if (normalizeGradeSlug(currentGrade) === normalizedGrade) return { ok: false, errorKey: "same_grade" };
  return { ok: true, normalizedGrade };
}

export function mapAuthEmailChangeError(err) {
  const code = err?.code ?? "";
  const msg = String(err?.message ?? "").toLowerCase();
  if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered")) {
    return "duplicate_email";
  }
  if (code === "invalid_email" || msg.includes("invalid email")) return "invalid_email";
  if (msg.includes("rate limit")) return "rate_limit";
  if (msg.includes("network")) return "network";
  return "generic";
}

export function createSubmitGuard() {
  let inFlight = false;
  return {
    trySubmit() {
      if (inFlight) return { accepted: false, reason: "in_flight" };
      inFlight = true;
      return { accepted: true };
    },
    finish() {
      inFlight = false;
    },
  };
}

/** Simulated email change preserving user_id and parent_link_code. */
export function simulateEmailChange(registry, userId, currentEmail, newEmail, confirmEmail) {
  const validated = validateStudentEmailChangeInput(currentEmail, newEmail, confirmEmail);
  if (!validated.ok) return validated;

  for (const [, user] of registry.authUsers) {
    if (user.email === validated.normalizedNew && user.id !== userId) {
      return { ok: false, errorKey: "duplicate_email" };
    }
  }

  const authUser = registry.authUsers.get(userId);
  const profile = registry.profiles.get(userId);
  if (!authUser || !profile) return { ok: false, errorKey: "generic" };

  authUser.email = validated.normalizedNew;
  profile.email = validated.normalizedNew;
  return {
    ok: true,
    email: validated.normalizedNew,
    userId: authUser.id,
    parentLinkCode: profile.parent_link_code,
    role: registry.roles.get(userId),
  };
}

/** Simulated grade change preserving quiz history keyed by user_id. */
export function simulateGradeChange(registry, userId, currentGrade, newGrade) {
  const validated = validateStudentGradeChangeInput(currentGrade, newGrade);
  if (!validated.ok) return validated;

  const profile = registry.profiles.get(userId);
  if (!profile) return { ok: false, errorKey: "invalid_grade" };

  profile.grade = validated.normalizedGrade;
  const quizCount = (registry.quizSubmissions.get(userId) ?? []).length;
  const certCount = (registry.certificates.get(userId) ?? []).length;
  return {
    ok: true,
    grade: validated.normalizedGrade,
    userId,
    parentLinkCode: profile.parent_link_code,
    quizSubmissionsPreserved: quizCount,
    certificatesPreserved: certCount,
  };
}

export function lessonVisibilityGrade(profileGrade, lessonGrade) {
  return normalizeGradeSlug(profileGrade) === normalizeGradeSlug(lessonGrade);
}
