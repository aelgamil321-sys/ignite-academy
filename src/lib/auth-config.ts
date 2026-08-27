/** Parse boolean env flag (accepts "true"/"false", "1"/"0"). */
function parseEnvFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return defaultValue;
}

/**
 * Email verification is REQUIRED in production builds and cannot be disabled.
 * Local development may opt out with VITE_DISABLE_EMAIL_VERIFICATION=true only.
 */
const devBypassVerification = parseEnvFlag(import.meta.env.VITE_DISABLE_EMAIL_VERIFICATION, false);

export const ENABLE_EMAIL_VERIFICATION = import.meta.env.PROD ? true : !devBypassVerification;

export function isEmailVerificationRequired(): boolean {
  return ENABLE_EMAIL_VERIFICATION;
}

/** True when login/signup should be blocked pending email confirmation. */
export function shouldRequireEmailConfirmation(
  user: { email_confirmed_at?: string | null } | null | undefined,
): boolean {
  if (!ENABLE_EMAIL_VERIFICATION) return false;
  return !user?.email_confirmed_at;
}
