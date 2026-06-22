/** Parse boolean env flag (accepts "true"/"false", "1"/"0"). */
function parseEnvFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return defaultValue;
}

/**
 * Require email confirmation before login/signup completion.
 * Set VITE_ENABLE_EMAIL_VERIFICATION=true (or ENABLE_EMAIL_VERIFICATION=true at build time)
 * to re-enable verification without changing the signup flow.
 */
export const ENABLE_EMAIL_VERIFICATION = parseEnvFlag(
  import.meta.env.VITE_ENABLE_EMAIL_VERIFICATION ??
    import.meta.env.ENABLE_EMAIL_VERIFICATION,
  false,
);

export function isEmailVerificationEnabled(): boolean {
  return ENABLE_EMAIL_VERIFICATION;
}

/** True when login/signup should be blocked pending email confirmation. */
export function shouldRequireEmailConfirmation(
  user: { email_confirmed_at?: string | null } | null | undefined,
): boolean {
  if (!ENABLE_EMAIL_VERIFICATION) return false;
  return !user?.email_confirmed_at;
}
