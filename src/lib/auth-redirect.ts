import { supabase } from "@/integrations/supabase/client";
import { isEmailVerificationRequired } from "@/lib/auth-config";
import { hasSignupAuthHash, isRecoveryAuthHash } from "@/lib/password-recovery";

/** Where Supabase sends users after confirming signup email (must be allowlisted in Supabase Auth). */
export const SIGNUP_EMAIL_REDIRECT_URL =
  "https://ignite-academy.ignite-school.workers.dev/auth?mode=login&email_confirmed=true";

/** Sign-up options that request confirmation emails when verification is required. */
export function signupAuthOptions(
  data: Record<string, unknown>,
): { emailRedirectTo?: string; data: Record<string, unknown> } {
  if (!isEmailVerificationRequired()) {
    return { data };
  }
  return {
    emailRedirectTo: SIGNUP_EMAIL_REDIRECT_URL,
    data,
  };
}

export type EmailConfirmedParam = true | false | undefined;

export function parseEmailConfirmedParam(value: unknown): EmailConfirmedParam {
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return undefined;
}

export type SupabaseAuthHashError = {
  code: string;
  description: string;
};

export function parseSupabaseAuthHashError(): SupabaseAuthHashError | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const error = params.get("error");
  const errorCode = params.get("error_code");
  if (!error && !errorCode) return null;
  return {
    code: errorCode ?? error ?? "unknown",
    description: params.get("error_description") ?? "",
  };
}

export function hasSupabaseAuthHash(): boolean {
  return hasSignupAuthHash() || isRecoveryAuthHash();
}

/** Wait once for the Supabase client to consume hash tokens from the URL. */
export async function waitForSupabaseHashSession(): Promise<void> {
  if (!hasSupabaseAuthHash()) return;
  await new Promise((resolve) => setTimeout(resolve, 150));
  await supabase.auth.getSession();
}

export function clearAuthCallbackUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("email_confirmed");
  url.hash = "";
  const next = `${url.pathname}${url.search}`;
  window.history.replaceState({}, "", next || "/auth");
}

export function isEmailNotConfirmedError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const o = err as { code?: string; message?: string };
    if (o.code === "email_not_confirmed") return true;
    const msg = (o.message ?? "").toLowerCase();
    if (msg.includes("email not confirmed")) return true;
    if (msg.includes("email_not_confirmed")) return true;
  }
  return false;
}

export function isEmailRateLimitError(err: unknown): boolean {
  if (err && typeof err === "object") {
    const o = err as { code?: string; message?: string; status?: number };
    if (o.code === "over_email_send_rate_limit") return true;
    if (o.status === 429) return true;
    const msg = (o.message ?? "").toLowerCase();
    if (msg.includes("rate limit")) return true;
    if (msg.includes("email rate limit")) return true;
  }
  return false;
}

export function isDuplicateEmailError(err: unknown): boolean {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "user_already_exists" || code === "email_exists") return true;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("already registered")) return true;
    if (msg.includes("user already registered")) return true;
  }
  return false;
}

export type SignupErrorKind =
  | "duplicate_email"
  | "rate_limit"
  | "invalid_email"
  | "weak_password"
  | "network"
  | "generic";

export function classifySignupError(err: unknown): SignupErrorKind {
  if (isEmailRateLimitError(err)) return "rate_limit";
  if (isDuplicateEmailError(err)) return "duplicate_email";

  if (err && typeof err === "object") {
    const o = err as { code?: string; message?: string };
    const code = (o.code ?? "").toLowerCase();
    const msg = (o.message ?? "").toLowerCase();

    if (code === "invalid_email" || msg.includes("invalid email")) return "invalid_email";
    if (
      code === "weak_password" ||
      msg.includes("password should be") ||
      msg.includes("password is too weak") ||
      (msg.includes("password") && msg.includes("at least"))
    ) {
      return "weak_password";
    }
    if (
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("networkerror") ||
      code === "network_error"
    ) {
      return "network";
    }
  }

  return "generic";
}
