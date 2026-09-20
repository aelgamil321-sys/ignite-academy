import { L } from "@/lib/i18n";
import { brandedTitle, brandedTitleAr } from "@/lib/brand";
import { isLang, LANG_STORAGE_KEY, type Lang } from "@/lib/i18n-config";

export type PageHeadKey = "auth" | "parent_corner" | "announcements" | "lesson";

const TITLES: Record<PageHeadKey, Record<Lang, string>> = {
  auth: L(brandedTitle("Account"), brandedTitleAr("الحساب")),
  parent_corner: L(brandedTitle("Parent Corner"), brandedTitleAr("ركن الوالدين")),
  announcements: L(brandedTitle("Announcements"), brandedTitleAr("الإعلانات")),
  lesson: L(brandedTitle("Lesson"), brandedTitleAr("الدرس")),
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
