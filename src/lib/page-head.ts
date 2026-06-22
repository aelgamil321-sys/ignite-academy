import { L } from "@/lib/i18n";
import { isLang, LANG_STORAGE_KEY, type Lang } from "@/lib/i18n-config";

export type PageHeadKey = "auth" | "parent_corner" | "announcements" | "lesson";

const TITLES: Record<PageHeadKey, Record<Lang, string>> = {
  auth: L(
    "Student Sign In — Ignite Islamic Academy",
    "تسجيل الدخول — أكاديمية اجنايت الإسلامية",
  ),
  parent_corner: L(
    "Parent Corner — Ignite Islamic Academy",
    "ركن الوالدين — أكاديمية اجنايت الإسلامية",
  ),
  announcements: L(
    "Announcements — Ignite Islamic Academy",
    "الإعلانات — أكاديمية اجنايت الإسلامية",
  ),
  lesson: L(
    "Lesson — Ignite Islamic Academy",
    "الدرس — أكاديمية اجنايت الإسلامية",
  ),
};

/** Resolve active UI language for static route head (client: localStorage; SSR: Arabic). */
export function headLang(): Lang {
  if (typeof window === "undefined") return "ar";
  const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
  return isLang(saved) ? saved : "ar";
}

export function pageHeadTitle(key: PageHeadKey): string {
  return TITLES[key][headLang()];
}
