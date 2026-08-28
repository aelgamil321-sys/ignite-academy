import { supabase } from "@/integrations/supabase/client";
import { parseSupabaseAuthHashError } from "@/lib/auth-redirect";

export const PASSWORD_RECOVERY_STORAGE_KEY = "ia_password_recovery";

/** Origin-based redirect URL for Supabase password recovery emails. */
export function passwordResetRedirectUrl(): string {
  if (typeof window === "undefined") return "/reset-password";
  return `${window.location.origin}/reset-password`;
}

export function markPasswordRecoveryPending(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, "1");
}

export function clearPasswordRecoveryPending(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY);
}

export function isPasswordRecoveryPending(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PASSWORD_RECOVERY_STORAGE_KEY) === "1";
}

export function isRecoveryAuthHash(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  if (params.get("error") || params.get("error_code")) return false;
  return params.get("type") === "recovery";
}

export function hasSignupAuthHash(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  if (params.get("error") || params.get("error_code")) return false;
  if (params.get("type") === "recovery") return false;
  return (
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.get("type") === "signup" ||
    params.get("type") === "email_change"
  );
}

export function shouldDeferToPasswordReset(): boolean {
  return isRecoveryAuthHash() || isPasswordRecoveryPending();
}

export function redirectToResetPasswordIfRecovery(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/reset-password") return;
  if (isRecoveryAuthHash()) {
    markPasswordRecoveryPending();
    window.location.replace(`/reset-password${window.location.hash}`);
    return;
  }
  if (isPasswordRecoveryPending()) {
    window.location.replace("/reset-password");
  }
}

export function clearPasswordRecoveryHashFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

export async function waitForPasswordRecoverySession(timeoutMs = 2500): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const hashError = parseSupabaseAuthHashError();
  if (hashError) return false;

  if (isRecoveryAuthHash()) {
    markPasswordRecoveryPending();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await supabase.auth.getSession();
  }

  const { data } = await supabase.auth.getSession();
  if (data.session && (isPasswordRecoveryPending() || isRecoveryAuthHash())) {
    return true;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timer);
      resolve(ok);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        markPasswordRecoveryPending();
        finish(true);
      }
    });

    const timer = window.setTimeout(async () => {
      const { data: retry } = await supabase.auth.getSession();
      finish(Boolean(retry.session) && isPasswordRecoveryPending());
    }, timeoutMs);
  });
}

export async function requestPasswordResetEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: passwordResetRedirectUrl(),
  });
  if (error) throw error;
}

export async function updatePasswordFromRecovery(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
