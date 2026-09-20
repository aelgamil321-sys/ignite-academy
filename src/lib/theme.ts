/**
 * GHIRAS — centralized brand design tokens.
 * Source of truth for colors is `src/styles.css` CSS variables and `src/lib/brand.ts`.
 */

import { BRAND } from "@/lib/brand";

export const theme = {
  brand: {
    nameEn: BRAND.nameEn,
    nameAr: BRAND.nameAr,
  },
  colors: {
    primary: BRAND.colors.primary,
    primaryHover: BRAND.colors.primaryHover,
    accent: BRAND.colors.accent,
    dark: BRAND.colors.dark,
    background: BRAND.colors.ivory,
    white: "#FFFFFF",
    border: BRAND.colors.softGray,
    muted: "#5A5550",
    success: "#2F7D4A",
    warning: BRAND.colors.accent,
  },
} as const;
