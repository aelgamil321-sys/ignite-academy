/** Where Supabase sends users after confirming signup email (must be allowlisted in Supabase Auth). */
export const SIGNUP_EMAIL_REDIRECT_URL =
  "https://ignite-academy.pages.dev/auth?mode=login&email_confirmed=1";

export function isEmailConfirmationReturn(): boolean {
  if (typeof window === "undefined") return false;
  const search = new URLSearchParams(window.location.search);
  if (search.get("email_confirmed") === "1") return true;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const type = hash.get("type");
  return type === "signup" || type === "email_change";
}

export function clearEmailConfirmationParams(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("email_confirmed");
  url.hash = "";
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}
