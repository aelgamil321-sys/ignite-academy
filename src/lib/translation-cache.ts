import type { Lang } from "@/lib/i18n-config";

const CACHE_STORAGE_KEY = "iia.translation.cache.v1";
const MAX_CACHE_ENTRIES = 4000;

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
  } catch {
    memoryCache = {};
  }
  return memoryCache;
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

export function translationCacheKey(lang: Lang, source: string): string {
  return `${lang}::${source}`;
}

export function getCachedTranslation(lang: Lang, source: string): string | null {
  if (!source) return null;
  const store = loadStore();
  return store[translationCacheKey(lang, source)] ?? null;
}

export function setCachedTranslation(lang: Lang, source: string, translated: string): void {
  if (!source) return;
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
