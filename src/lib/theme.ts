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
    onDark: "#FFFFFF",
    onDarkMuted: BRAND.colors.softGray,
  },
} as const;

/** Shared classes for charcoal dashboards, sidebars, and dark heroes. */
export const darkSurface = {
  panel: "bg-brand-dark text-white",
  heading: "text-white",
  accent: "text-[#FF7A00]",
  body: "text-[#E7E2DC]",
  muted: "text-[#E7E2DC]/80",
  chip: "border-white/20 bg-white/10 text-white",
  iconChip: "bg-primary text-primary-foreground",
} as const;

export const darkNav = {
  item: "flex min-h-[2.375rem] items-center gap-2 rounded-lg px-2 text-[0.875rem] font-medium text-[#E7E2DC] transition-colors hover:bg-white/10 hover:text-white",
  itemActive: "bg-primary text-white hover:bg-primary hover:text-white",
  itemDisabled: "cursor-not-allowed text-white/40",
  icon: "h-[1.125rem] w-[1.125rem] shrink-0 text-[#E7E2DC]",
  iconActive: "h-[1.125rem] w-[1.125rem] shrink-0 text-white",
  section: "px-2 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#E7E2DC]/75 first:pt-0",
  title: "text-center font-display text-[0.8125rem] font-semibold text-white",
  subtitle: "text-center text-[10px] leading-snug text-[#E7E2DC]",
  signOut:
    "mt-1.5 flex min-h-[2.375rem] w-full items-center gap-2 rounded-lg px-2 text-[0.875rem] font-medium text-[#E7E2DC] transition-colors hover:bg-white/10 hover:text-white",
} as const;
