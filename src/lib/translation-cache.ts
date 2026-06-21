import type { Lang } from "@/lib/i18n-config";
import type { EducationalContentType } from "@/lib/translate-educational-content";

const CACHE_STORAGE_KEY = "iia.translation.cache.v5";
const LEGACY_CACHE_STORAGE_KEYS = [
  "iia.translation.cache.v4",
  "iia.translation.cache.v3",
  "iia.translation.cache.v1",
] as const;
const MAX_CACHE_ENTRIES = 5000;

type CacheStore = Record<string, string>;

let memoryCache: CacheStore | null = null;

function loadStore(): CacheStore {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") {
    memoryCache = {};
    return memoryCache;
  }
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    memoryCache = raw ? (JSON.parse(raw) as CacheStore) : {};
    for (const legacyKey of LEGACY_CACHE_STORAGE_KEYS) {
      window.localStorage.removeItem(legacyKey);
    }
    purgeInvalidDynamicLanguageEntries(memoryCache);
  } catch {
    memoryCache = {};
  }
  return memoryCache;
}

/** Drop legacy fr::source keys where translation equals source. */
function purgeInvalidDynamicLanguageEntries(store: CacheStore): void {
  let changed = false;
  for (const [key, value] of Object.entries(store)) {
    const lang = key.split("::")[0] as Lang;
    if (lang !== "fr" && lang !== "de" && lang !== "ur" && lang !== "zh") continue;
    const parts = key.split("::");
    if (parts.length !== 2) continue;
    const source = parts[1] ?? "";
    if (source && value.trim() === source.trim()) {
      delete store[key];
      changed = true;
    }
  }
  if (changed) persistStore(store);
}

/** Reject stale entries that stored untranslated source text as the target language. */
function isValidEducationalCacheHit(
  translated: string,
  input: EducationalCacheKeyInput,
): boolean {
  const out = translated?.trim();
  if (!out) return false;
  if (input.lang === "en" || input.lang === "ar") return true;
  return out !== input.source.trim();
}

function persistStore(store: CacheStore) {
  if (typeof window === "undefined") return;
  const keys = Object.keys(store);
  if (keys.length > MAX_CACHE_ENTRIES) {
    const trim = keys.slice(0, keys.length - MAX_CACHE_ENTRIES);
    for (const k of trim) delete store[k];
  }
  try {
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded — keep in-memory only.
  }
}

/** Stable short hash for cache keys (djb2). */
export function contentHash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h) ^ text.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

export type EducationalCacheKeyInput = {
  lang: Lang;
  contentType: EducationalContentType;
  lessonId?: string;
  fieldName?: string;
  source: string;
};

/** language + contentType + lessonId + fieldName + contentHash */
export function buildEducationalCacheKey({
  lang,
  contentType,
  lessonId = "_",
  fieldName = "_",
  source,
}: EducationalCacheKeyInput): string {
  return `${lang}::${contentType}::${lessonId}::${fieldName}::${contentHash(source)}`;
}

/** Legacy key for backward-compatible lookups. */
export function translationCacheKey(lang: Lang, source: string): string {
  return `${lang}::${source}`;
}

/** Reuse a translation for the same source text within a lesson (any fieldName). */
export function findLessonTranslationBySource(
  lang: Lang,
  lessonId: string | undefined,
  source: string,
): string | null {
  if (!source || lang === "en") return null;
  const store = loadStore();
  const hash = contentHash(source);
  const lessonPart = lessonId ?? "_";

  for (const [key, value] of Object.entries(store)) {
    if (!key.startsWith(`${lang}::`)) continue;
    if (!key.includes(`::${lessonPart}::`) || !key.endsWith(`::${hash}`)) continue;
    const input: EducationalCacheKeyInput = {
      lang,
      contentType: "general",
      lessonId,
      fieldName: "_",
      source,
    };
    if (isValidEducationalCacheHit(value, input)) return value;
  }

  const legacy = store[translationCacheKey(lang, source)];
  if (legacy) {
    const input: EducationalCacheKeyInput = { lang, contentType: "general", source };
    if (isValidEducationalCacheHit(legacy, input)) return legacy;
  }
  return null;
}

export function getCachedEducationalTranslation(input: EducationalCacheKeyInput): string | null {
  if (!input.source) return null;
  const store = loadStore();
  const key = buildEducationalCacheKey(input);
  const hit = store[key];
  if (hit && isValidEducationalCacheHit(hit, input)) return hit;

  const bySource = findLessonTranslationBySource(input.lang, input.lessonId, input.source);
  if (bySource) return bySource;

  const legacy = store[translationCacheKey(input.lang, input.source)];
  if (legacy && isValidEducationalCacheHit(legacy, input)) return legacy;
  return null;
}

export function setCachedEducationalTranslation(
  input: EducationalCacheKeyInput,
  translated: string,
): void {
  if (!input.source || !isValidEducationalCacheHit(translated, input)) return;
  const store = loadStore();
  store[buildEducationalCacheKey(input)] = translated;
  persistStore(store);
}

export function getCachedTranslation(lang: Lang, source: string): string | null {
  if (!source) return null;
  const store = loadStore();
  const hit = store[translationCacheKey(lang, source)];
  if (!hit) return null;
  if (lang !== "en" && lang !== "ar" && hit.trim() === source.trim()) return null;
  return hit;
}

export function setCachedTranslation(lang: Lang, source: string, translated: string): void {
  if (!source) return;
  if (lang !== "en" && lang !== "ar" && translated.trim() === source.trim()) return;
  const store = loadStore();
  store[translationCacheKey(lang, source)] = translated;
  persistStore(store);
}

export function getCachedTranslations(
  lang: Lang,
  sources: string[],
): Array<string | null> {
  return sources.map((s) => getCachedTranslation(lang, s));
}
