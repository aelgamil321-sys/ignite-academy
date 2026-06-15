import { supabase } from "@/integrations/supabase/client";

/** Where Supabase sends users after confirming signup email (must be allowlisted in Supabase Auth). */
export const SIGNUP_EMAIL_REDIRECT_URL =
  "https://ignite-academy.pages.dev/auth?mode=login&email_confirmed=true";

export type EmailConfirmedParam = true | false | undefined;

export function parseEmailConfirmedParam(value: unknown): EmailConfirmedParam {
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return undefined;
}

export function hasSupabaseAuthHash(): boolean {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  return (
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.get("type") === "signup" ||
    params.get("type") === "email_change" ||
    params.get("type") === "recovery"
  );
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
