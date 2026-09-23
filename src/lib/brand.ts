/**
 * GHIRAS — single source of truth for visible brand identity.
 * Do not hardcode school/platform names in UI; import from here.
 */

export const BRAND = {
  nameEn: "GHIRAS",
  nameAr: "غراس",
  taglineEn: "Plant Knowledge. Create Impact.",
  taglineAr: "نغرس معرفة... ونصنع أثرًا",
  platformEn: "Learning Platform",
  platformAr: "منصة تعليمية",
  colors: {
    primary: "#7A0D14",
    primaryHover: "#5E0A10",
    accent: "#FF7A00",
    ivory: "#FAF8F5",
    dark: "#2D2D2D",
    softGray: "#E7E2DC",
  },
  logoPrimary: "/logos/ghiras-primary.png",
  /** No official compact PNG was supplied. UI branding uses the primary PNG. Tab icons keep a tiny mark only. */
  logoCompact: "/logos/ghiras-primary.png",
  favicon: "/favicon.svg",
  appleTouchIcon: "/favicon.svg",
  ogImage: "/logos/ghiras-primary.png",
} as const;

const LOGO_CACHE_VERSION = "20260920png";

function publicAssetUrl(path: string): string {
  const url = `${path}?v=${LOGO_CACHE_VERSION}`;
  if (typeof window !== "undefined") {
    return new URL(url, window.location.origin).href;
  }
  return url;
}

export function brandLogoPrimaryUrl(): string {
  return publicAssetUrl(BRAND.logoPrimary);
}

export function brandLogoCompactUrl(): string {
  return publicAssetUrl(BRAND.logoCompact);
}

export function brandedTitle(pageEn: string): string {
  return `${BRAND.nameEn} | ${pageEn}`;
}

export function brandedTitleAr(pageAr: string): string {
  return `${BRAND.nameAr} | ${pageAr}`;
}

export const HOME_PAGE_TITLE = `${BRAND.nameEn} | ${BRAND.nameAr}`;
export const HOME_PAGE_TITLE_AR = `${BRAND.nameAr} | ${BRAND.nameEn}`;

export const HOME_PAGE_DESCRIPTION =
  "Professional learning platform focused on knowledge, values, growth and impact.";

export const HOME_PAGE_DESCRIPTION_AR =
  "منصة تعليمية مهنية تركز على المعرفة والقيم والنمو وصناعة الأثر.";
