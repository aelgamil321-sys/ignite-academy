/**
 * Deterministic mocks for student registration concurrency safety (no Auth/API calls).
 */

export function createSubmitGuard() {
  let busy = false;
  let signupInFlight = false;
  let signUpCalls = 0;

  return {
    trySubmit() {
      if (busy || signupInFlight) return { accepted: false, reason: "in_flight" };
      signupInFlight = true;
      busy = true;
      return { accepted: true };
    },
    recordSignUpCall() {
      signUpCalls += 1;
    },
    finish() {
      busy = false;
      signupInFlight = false;
    },
    get signUpCalls() {
      return signUpCalls;
    },
  };
}

/** Mirrors generate_parent_link_code collision retry (DB trigger logic). */
export function generateUniqueLinkCode(existingCodes, rng = Math.random) {
  const normalized = new Set(existingCodes.map((c) => c.toUpperCase().replace(/[^A-Z0-9]/g, "")));

  for (let attempt = 0; attempt < 41; attempt += 1) {
    const suffix = String(Math.floor(rng() * 1_000_000)).padStart(6, "0").slice(-6);
    const candidate = `IIA-${suffix}`;
    const key = candidate.replace(/[^A-Z0-9]/g, "");
    if (!normalized.has(key)) {
      normalized.add(key);
      return { code: candidate, attempts: attempt + 1 };
    }
  }

  throw new Error("Could not generate unique parent link code");
}

export function simulateRegistration(registry, email, userIdFactory) {
  const key = email.trim().toLowerCase();
  if (registry.authUsers.has(key)) {
    return { ok: false, error: "duplicate_email" };
  }

  const userId = userIdFactory();
  registry.authUsers.set(key, userId);

  if (registry.profiles.has(userId)) {
    return { ok: false, error: "duplicate_profile" };
  }

  const link = generateUniqueLinkCode([...registry.linkCodes]);
  registry.linkCodes.add(link.code);
  registry.profiles.set(userId, {
    user_id: userId,
    parent_link_code: link.code,
    grade: "10",
    section: "A",
    islamic_group: "A",
  });

  return { ok: true, userId, parentLinkCode: link.code };
}

export function simulateSignupWithOptionalPhoto({ photoUploadFails = false } = {}) {
  const account = { userId: "user-1", profileCreated: true, session: true };
  let photoPath = null;
  let photoError = null;

  if (photoUploadFails) {
    photoError = "storage_unavailable";
  } else {
    photoPath = `${account.userId}/${Date.now()}-photo.jpg`;
  }

  return {
    accountUsable: account.profileCreated && account.session,
    photoPath,
    photoError,
    signupCompleted: true,
  };
}

export async function runConcurrentSubmissions(count, submitFn) {
  const results = await Promise.all(
    Array.from({ length: count }, (_, i) => submitFn(`student${i}@school.test`)),
  );
  return results;
}
