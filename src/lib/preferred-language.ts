import { supabase } from "@/integrations/supabase/client";
import { getAccountRole, type AccountRole } from "@/lib/account-role";
import { LANG_STORAGE_KEY, detectBrowserLang, isLang, type Lang } from "@/lib/i18n-config";

export function normalizePreferredLang(value: string | null | undefined): Lang | null {
  return isLang(value) ? value : null;
}

/** Guest / logged-out language: localStorage → browser → Arabic. */
export function resolveGuestLanguage(): Lang {
  if (typeof window === "undefined") return "ar";
  const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (isLang(saved)) return saved;
  return detectBrowserLang();
}

export function persistLanguage(lang: Lang): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  }
}

export async function fetchPreferredLanguage(userId: string): Promise<Lang | null> {
  const role = await getAccountRole(userId);
  if (role === "parent") {
    const { data, error } = await supabase
      .from("parent_profiles")
      .select("preferred_language")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.warn("[preferred_language fetch parent]", error.message);
      return null;
    }
    return normalizePreferredLang(data?.preferred_language);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[preferred_language fetch profile]", error.message);
    return null;
  }
  return normalizePreferredLang(data?.preferred_language);
}

export async function savePreferredLanguage(
  userId: string,
  lang: Lang,
  role?: AccountRole | null,
): Promise<void> {
  const resolvedRole = role ?? (await getAccountRole(userId));
  const payload = { preferred_language: lang, updated_at: new Date().toISOString() };

  if (resolvedRole === "parent") {
    const { error } = await supabase
      .from("parent_profiles")
      .update(payload)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);
  if (error) throw error;
}

/** Load profile language and persist to localStorage (call before post-login redirect). */
export async function applyLanguageForUser(userId: string): Promise<Lang> {
  const fromProfile = await fetchPreferredLanguage(userId);
  const lang = fromProfile ?? resolveGuestLanguage();
  persistLanguage(lang);
  return lang;
}
