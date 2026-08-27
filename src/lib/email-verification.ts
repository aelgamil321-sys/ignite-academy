import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { isEmailVerificationRequired, shouldRequireEmailConfirmation } from "@/lib/auth-config";
import { isEmailRateLimitError, SIGNUP_EMAIL_REDIRECT_URL } from "@/lib/auth-redirect";

export type EmailVerifiedUser = { email_confirmed_at?: string | null };

export function isEmailVerified(user: EmailVerifiedUser | null | undefined): boolean {
  return Boolean(user?.email_confirmed_at);
}

export function requiresEmailVerification(user: EmailVerifiedUser | null | undefined): boolean {
  return shouldRequireEmailConfirmation(user);
}

export type VerifiedSessionResult =
  | { status: "none" }
  | { status: "unverified"; email: string }
  | { status: "verified"; user: User };

/** Resolve session user; reports unverified without signing out (for gate UI). */
export async function resolveVerifiedSession(): Promise<VerifiedSessionResult> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return { status: "none" };
  if (!isEmailVerificationRequired()) return { status: "verified", user };
  if (!isEmailVerified(user)) {
    return { status: "unverified", email: user.email ?? "" };
  }
  return { status: "verified", user };
}

export async function signOutUnverifiedUser(user: User | null | undefined): Promise<void> {
  if (!user || !requiresEmailVerification(user)) return;
  await supabase.auth.signOut();
}

export type ResendVerificationResult =
  | { ok: true }
  | { ok: false; rateLimited: boolean; message: string };

export async function resendSignupVerification(email: string): Promise<ResendVerificationResult> {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, rateLimited: false, message: "missing_email" };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: trimmed,
    options: { emailRedirectTo: SIGNUP_EMAIL_REDIRECT_URL },
  });

  if (error) {
    return {
      ok: false,
      rateLimited: isEmailRateLimitError(error),
      message: error.message,
    };
  }

  return { ok: true };
}
