import type { Bi } from "@/lib/curriculum";
import type { Lang } from "@/lib/i18n-config";
import { isLessonLang, parseLocalizedText, type LessonLang } from "@/lib/lesson-localized";
import {
  isLessonLangSlotMissing,
  readLessonLangSlot,
  resolveLessonLangText,
  type ResolvedLessonText,
} from "@/lib/lesson-multilingual-resolve";

export type LocalizedResolveMode = "strict" | "display" | "fallback";

export type LocalizedResolveResult = ResolvedLessonText & {
  /** Requested language has no valid stored content (may still show pending fallback in display mode). */
  missingTranslation: boolean;
};

const LANG_KEYS: LessonLang[] = ["ar", "en", "fr", "de", "ur", "zh"];

/** True when value looks like stored multilingual JSONB ({en, ar, fr, …}). */
export function isLocalizedContentObject(value: unknown): value is Bi {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const o = value as Record<string, unknown>;
  return LANG_KEYS.some((lang) => typeof o[lang] === "string");
}

/** Dev/QA guard — never render localized objects directly as React children. */
export function assertSafeReactLocalizedChild(value: unknown, context?: string): void {
  if (!import.meta.env.DEV) return;
  if (isLocalizedContentObject(value)) {
    console.error(
      `[i18n-guard] Blocked rendering localized object as React child${context ? `: ${context}` : ""}`,
      value,
    );
  }
}

/** Format unknown values for React text nodes; detects accidental Bi objects. */
export function formatLocalizedForReact(
  value: unknown,
  lang: Lang,
  format: (bi: Bi, lang: Lang) => string,
  context?: string,
): string {
  assertSafeReactLocalizedChild(value, context);
  if (isLocalizedContentObject(value)) return format(value, lang);
  if (value == null) return "";
  return String(value);
}

/**
 * Read persisted slot for the requested language only (script-aware, no cross-lang fallback).
 * Canonical stored-text resolver for CMS + lessons.
 */
export function resolveStoredLocalizedText(bi: Bi, lang: Lang): string | null {
  if (isLessonLang(lang)) {
    const value = readLessonLangSlot(bi, lang);
    if (value && !isLessonLangSlotMissing(bi, lang)) return value;
    return null;
  }
  if (lang === "en") {
    const en = bi.en?.trim();
    if (en) return en;
    return bi.ar?.trim() || null;
  }
  if (lang === "ar") {
    return bi.ar?.trim() || null;
  }
  return null;
}

/** Sync pending text while async MT runs — never substitute wrong-script content. */
export function resolveLocalizedPendingText(bi: Bi, lang: Lang): string {
  if (lang === "ar") {
    const ar = bi.ar?.trim();
    if (ar) return ar;
    return bi.en?.trim() || "";
  }
  if (lang === "en") {
    const en = bi.en?.trim();
    if (en) return en;
    return bi.ar?.trim() || "";
  }
  const extended = bi as Record<string, string | undefined>;
  const direct = extended[lang]?.trim();
  if (direct) return direct;
  return bi.en?.trim() || bi.ar?.trim() || "";
}

/**
 * Canonical localized content resolver.
 *
 * Resolution order (display mode):
 * 1. Exact stored requested language (script-validated)
 * 2. Pending fallback with explicit missingTranslation flag (MT/cache handled by bi())
 *
 * strict: requested lang only — lesson AI review tabs
 * fallback: script-aware cross-lang order — offline/error paths
 */
export function resolveLocalizedContent(
  bi: Bi | undefined | null,
  lang: Lang,
  mode: LocalizedResolveMode = "display",
): LocalizedResolveResult {
  if (!bi) {
    return { value: "", usedFallback: false, missingTranslation: true };
  }

  if (mode === "strict") {
    if (!isLessonLang(lang)) {
      const stored = resolveStoredLocalizedText(bi, lang);
      return {
        value: stored ?? "",
        usedFallback: false,
        missingTranslation: !stored,
      };
    }
    const missing = isLessonLangSlotMissing(bi, lang);
    const value = missing ? "" : readLessonLangSlot(bi, lang);
    return { value, usedFallback: false, missingTranslation: missing };
  }

  if (mode === "fallback") {
    if (!isLessonLang(lang)) {
      const stored = resolveStoredLocalizedText(bi, lang);
      return stored
        ? { value: stored, usedFallback: false, missingTranslation: false }
        : { value: "", usedFallback: false, missingTranslation: true };
    }
    const resolved = resolveLessonLangText(bi, lang);
    const directStored = resolveStoredLocalizedText(bi, lang);
    return {
      ...resolved,
      missingTranslation: !directStored,
    };
  }

  const stored = resolveStoredLocalizedText(bi, lang);
  if (stored) {
    return { value: stored, usedFallback: false, missingTranslation: false };
  }

  const pending = resolveLocalizedPendingText(bi, lang);
  const usedFallback = Boolean(pending) && lang !== "en" && lang !== "ar";
  return {
    value: pending,
    usedFallback,
    fallbackLang: usedFallback ? (bi.en?.trim() ? "en" : "ar") : undefined,
    missingTranslation: true,
  };
}

/** Regression: Arabic tab must not show English when valid Arabic exists. */
export function arabicUiShowsEnglishWhileArabicStored(bi: Bi, displayed: string): boolean {
  const parsed = parseLocalizedText(bi);
  const ar = parsed.ar?.trim();
  if (!ar || isLessonLangSlotMissing(bi, "ar")) return false;
  const en = parsed.en?.trim();
  if (!en) return false;
  return displayed.trim() === en && displayed.trim() !== ar;
}
