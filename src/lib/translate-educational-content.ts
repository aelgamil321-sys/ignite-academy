import type { Bi } from "@/lib/curriculum";
import type { Lang } from "@/lib/i18n-config";
import {
  buildEducationalCacheKey,
  getCachedEducationalTranslation,
  setCachedEducationalTranslation,
} from "@/lib/translation-cache";
import { callIgniteTranslate } from "@/lib/ai/ignite-ai";
import {
  mergeProtectedSegments,
  splitIslamicProtectedText,
  translatableSegments,
} from "@/lib/islamic-text-protection";

export type EducationalContentType =
  | "title"
  | "outcome"
  | "content"
  | "vocab_term"
  | "vocab_def"
  | "instruction"
  | "quiz_question"
  | "quiz_option"
  | "quiz_feedback"
  | "quiz_result"
  | "resource_label"
  | "general";

export type TranslateEducationalInput = {
  text: string;
  targetLanguage: Lang;
  sourceLanguage?: "en" | "ar";
  contentType: EducationalContentType;
  lessonId?: string;
  fieldName?: string;
};

export type TranslateEducationalResult = {
  text: string;
  fromCache: boolean;
  serviceUnavailable: boolean;
};

export type EducationalField = {
  fieldName: string;
  contentType: EducationalContentType;
  text: string;
  sourceLanguage?: "en" | "ar";
  lessonId?: string;
};

const BROWSER_TARGET: Record<Exclude<Lang, "en">, string> = {
  ar: "ar",
  fr: "fr",
  de: "de",
  ur: "ur",
  zh: "zh-CN",
};

const MAX_CONCURRENT = 3;
const BASE_TRANSLATION_TIMEOUT_MS = 8_000;
const MAX_TRANSLATION_TIMEOUT_MS = 25_000;
const MAX_FIELD_ATTEMPTS = 2;
const CONTENT_UPDATE_DEBOUNCE_MS = 100;

/** True when UI may show machine-translated CMS content (all langs except English). */
export function needsDynamicTranslation(lang: Lang): boolean {
  return lang !== "en";
}

/** Stored bilingual text for a locale (no machine translation). */
export function resolveStoredBiText(bi: Bi, lang: Lang): string | null {
  if (lang === "en") return bi.en?.trim() || bi.ar?.trim() || null;
  if (lang === "ar") return bi.ar?.trim() || null;
  return null;
}

/** Source text to translate into `targetLang`, or null when native text already exists. */
export function biSourceForTranslation(
  bi: Bi,
  targetLang: Lang,
): { text: string; sourceLanguage: "en" | "ar" } | null {
  if (targetLang === "en") {
    const en = bi.en?.trim();
    if (en) return { text: en, sourceLanguage: "en" };
    const ar = bi.ar?.trim();
    if (ar) return { text: ar, sourceLanguage: "ar" };
    return null;
  }
  if (targetLang === "ar") {
    if (bi.ar?.trim()) return null;
    const en = bi.en?.trim();
    if (en) return { text: en, sourceLanguage: "en" };
    return null;
  }
  const en = bi.en?.trim();
  if (en) return { text: en, sourceLanguage: "en" };
  const ar = bi.ar?.trim();
  if (ar) return { text: ar, sourceLanguage: "ar" };
  return null;
}

export function needsMachineTranslation(lang: Lang, bi?: Bi): boolean {
  if (lang === "en") return false;
  if (!bi) return lang !== "en";
  return biSourceForTranslation(bi, lang) !== null;
}

function sourceLangForText(text: string, preferred?: "en" | "ar"): "en" | "ar" {
  if (preferred) return preferred;
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
}

function debugTranslate(
  event: string,
  input: TranslateEducationalInput,
  extra?: Record<string, unknown>,
) {
  if (!import.meta.env.DEV) return;
  console.debug(`[i18n-translate] ${event}`, {
    lang: input.targetLanguage,
    contentType: input.contentType,
    fieldName: input.fieldName,
    lessonId: input.lessonId,
    sourceLen: input.text?.length ?? 0,
    sourcePreview: input.text?.slice(0, 80),
    ...extra,
  });
}

/** Arabic, then English — shown while machine translation is pending or unavailable. */
export function biPendingDisplayText(bi: Bi): string {
  return bi.ar?.trim() || bi.en?.trim() || "";
}

/** Sync display before async translation completes. */
export function educationalDisplayFallback(
  text: string,
  lang: Lang,
  bi?: Bi,
): string {
  const stored = bi ? resolveStoredBiText(bi, lang) : null;
  if (stored) return stored;
  if (lang === "en") return text;
  if (bi) {
    const pending = biPendingDisplayText(bi);
    if (pending) return pending;
  }
  return text?.trim() ?? "";
}

let translationServiceAvailable: boolean | null = null;
const availabilityListeners = new Set<(available: boolean) => void>();
let sessionSuccessCount = 0;
let sessionExhaustedFailureCount = 0;

export function isTranslationServiceAvailable(): boolean {
  return translationServiceAvailable !== false;
}

export function hasSuccessfulEducationalTranslations(): boolean {
  return sessionSuccessCount > 0;
}

export function onTranslationAvailabilityChange(
  listener: (available: boolean) => void,
): () => void {
  availabilityListeners.add(listener);
  if (translationServiceAvailable !== null) {
    listener(translationServiceAvailable);
  }
  return () => availabilityListeners.delete(listener);
}

function setTranslationServiceAvailable(available: boolean) {
  if (translationServiceAvailable === available) return;
  translationServiceAvailable = available;
  for (const listener of availabilityListeners) {
    listener(available);
  }
}

function parseGtxJson(json: unknown): string | null {
  if (!Array.isArray(json) || !Array.isArray(json[0])) return null;
  const parts = (json[0] as Array<[string, ...unknown[]]>).map((row) => row[0]).filter(Boolean);
  return parts.join("").trim() || null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function timeoutForText(text: string): number {
  return Math.min(MAX_TRANSLATION_TIMEOUT_MS, BASE_TRANSLATION_TIMEOUT_MS + Math.floor(text.length / 40));
}

function looksMostlyEnglish(text: string): boolean {
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const arabic = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  return latin > arabic;
}

async function fetchGtxPart(
  part: string,
  target: string,
  sourceLang: "en" | "ar",
): Promise<string | null> {
  const q = encodeURIComponent(part.slice(0, 4500));
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${target}&dt=t&q=${q}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const out = parseGtxJson((await res.json()) as unknown);
  return out && out !== part ? out : null;
}

async function igniteServerTranslate(
  source: string,
  lang: Lang,
  sourceLang: "en" | "ar",
  meta: Pick<TranslateEducationalInput, "contentType" | "lessonId" | "fieldName">,
): Promise<string | null> {
  if (lang === "en" || lang === sourceLang) return null;
  try {
    const result = await withTimeout(
      callIgniteTranslate({
        texts: [source],
        targetLang: lang,
        sourceLang,
        contentType: meta.contentType,
        lessonId: meta.lessonId,
        fieldNames: [meta.fieldName ?? "_"],
      }),
      timeoutForText(source),
    );
    if (!result) return null;
    const translated = result.translations[0];
    if (translated && translated.trim() && translated !== source) return translated;
    return null;
  } catch {
    return null;
  }
}

/** Browser-side gtx fallback when server AI is unavailable. */
async function browserTranslateText(
  source: string,
  lang: Lang,
  sourceLang: "en" | "ar",
): Promise<string | null> {
  if (typeof window === "undefined" || lang === "en" || lang === sourceLang) return null;
  const target = BROWSER_TARGET[lang as Exclude<Lang, "en">];
  const segments = splitIslamicProtectedText(source);
  const parts = translatableSegments(segments);
  if (parts.length === 0) return source;

  const translatedParts: string[] = [];
  for (const part of parts) {
    let out = await fetchGtxPart(part, target, sourceLang);
    if (!out && sourceLang !== "en" && looksMostlyEnglish(part)) {
      out = await fetchGtxPart(part, target, "en");
    }
    if (!out && sourceLang === "en") {
      out = await fetchGtxPart(part, target, "en");
    }
    translatedParts.push(out ?? part);
  }

  const merged = mergeProtectedSegments(segments, translatedParts);
  return merged !== source ? merged : null;
}

function scheduleKey(input: TranslateEducationalInput): string {
  return buildEducationalCacheKey({
    lang: input.targetLanguage,
    contentType: input.contentType,
    lessonId: input.lessonId,
    fieldName: input.fieldName,
    source: input.text,
  });
}

type PendingJob = TranslateEducationalInput & {
  resolvers: Array<(value: TranslateEducationalResult) => void>;
};

const browserQueue: PendingJob[] = [];
const inflightKeys = new Set<string>();
const attemptCounts = new Map<string, number>();
const queuedKeys = new Set<string>();
let activeJobs = 0;
let onContentUpdate: (() => void) | null = null;
let onTranslatingChange: ((activeCount: number) => void) | null = null;
let updateTimer: ReturnType<typeof setTimeout> | null = null;

function recomputeTranslationAvailability() {
  const busy = activeJobs > 0 || browserQueue.length > 0;
  if (busy) return;
  const available = sessionSuccessCount > 0 || sessionExhaustedFailureCount === 0;
  setTranslationServiceAvailable(available);
}

/** Clear in-flight tracking when the user switches language. */
export function resetTranslationSession(): void {
  attemptCounts.clear();
  queuedKeys.clear();
  sessionSuccessCount = 0;
  sessionExhaustedFailureCount = 0;
  setTranslationServiceAvailable(true);
}

/** Register UI refresh + in-flight count callbacks (from I18nProvider via useEffect). */
export function initEducationalTranslationScheduler(
  onUpdate: () => void,
  onTranslating?: (activeCount: number) => void,
): () => void {
  onContentUpdate = onUpdate;
  onTranslatingChange = onTranslating ?? null;
  return () => {
    if (onContentUpdate === onUpdate) onContentUpdate = null;
    if (onTranslatingChange === onTranslating) onTranslatingChange = null;
  };
}

function notifyTranslatingCount() {
  if (!onTranslatingChange) return;
  onTranslatingChange(activeJobs + browserQueue.length);
}

function scheduleContentUpdate() {
  if (!onContentUpdate || updateTimer !== null) return;
  updateTimer = setTimeout(() => {
    updateTimer = null;
    onContentUpdate?.();
  }, CONTENT_UPDATE_DEBOUNCE_MS);
}

function resolveJob(job: PendingJob, result: TranslateEducationalResult) {
  for (const resolve of job.resolvers) resolve(result);
}

function pumpBrowserQueue() {
  if (typeof window === "undefined") return;

  while (activeJobs < MAX_CONCURRENT && browserQueue.length > 0) {
    const job = browserQueue.shift()!;
    const key = scheduleKey(job);
    if (inflightKeys.has(key)) continue;

    inflightKeys.add(key);
    activeJobs++;
    notifyTranslatingCount();

    void (async () => {
      const sourceLang = sourceLangForText(job.text, job.sourceLanguage);
      const cacheInput = {
        lang: job.targetLanguage,
        contentType: job.contentType,
        lessonId: job.lessonId,
        fieldName: job.fieldName,
        source: job.text,
      };

      try {
        const attempts = (attemptCounts.get(key) ?? 0) + 1;
        attemptCounts.set(key, attempts);

        let translated = await withTimeout(
          igniteServerTranslate(job.text, job.targetLanguage, sourceLang, job),
          timeoutForText(job.text),
        );

        if (!translated) {
          translated = await withTimeout(
            browserTranslateText(job.text, job.targetLanguage, sourceLang),
            timeoutForText(job.text),
          );
        }

        if (!translated && attempts < MAX_FIELD_ATTEMPTS && sourceLang !== "en") {
          translated = await withTimeout(
            igniteServerTranslate(job.text, job.targetLanguage, "en", job),
            timeoutForText(job.text),
          );
        }

        if (!translated && attempts < MAX_FIELD_ATTEMPTS && sourceLang !== "en") {
          translated = await withTimeout(
            browserTranslateText(job.text, job.targetLanguage, "en"),
            timeoutForText(job.text),
          );
        }

        if (translated) {
          setCachedEducationalTranslation(cacheInput, translated);
          sessionSuccessCount += 1;
          debugTranslate("browser-ok", job, { resultPreview: translated.slice(0, 80) });
          resolveJob(job, {
            text: translated,
            fromCache: false,
            serviceUnavailable: false,
          });
        } else {
          const exhausted = attempts >= MAX_FIELD_ATTEMPTS;
          if (exhausted) sessionExhaustedFailureCount += 1;
          const fallback = educationalDisplayFallback(job.text, job.targetLanguage);
          debugTranslate("browser-fail", job, { fallback: true, attempts });
          resolveJob(job, {
            text: fallback,
            fromCache: false,
            serviceUnavailable: exhausted,
          });
        }
      } catch {
        sessionExhaustedFailureCount += 1;
        resolveJob(job, {
          text: educationalDisplayFallback(job.text, job.targetLanguage),
          fromCache: false,
          serviceUnavailable: true,
        });
      } finally {
        inflightKeys.delete(key);
        queuedKeys.delete(key);
        activeJobs--;
        notifyTranslatingCount();
        recomputeTranslationAvailability();
        scheduleContentUpdate();
        pumpBrowserQueue();
      }
    })();
  }
}

function enqueueBrowserTranslation(
  input: TranslateEducationalInput,
): Promise<TranslateEducationalResult> {
  const key = scheduleKey(input);
  const attempts = attemptCounts.get(key) ?? 0;

  if (attempts >= MAX_FIELD_ATTEMPTS) {
    return Promise.resolve({
      text: educationalDisplayFallback(input.text, input.targetLanguage),
      fromCache: false,
      serviceUnavailable: true,
    });
  }

  return new Promise((resolve) => {
    const existing = browserQueue.find((j) => scheduleKey(j) === key);
    if (existing) {
      existing.resolvers.push(resolve);
      return;
    }

    if (inflightKeys.has(key) || queuedKeys.has(key)) {
      browserQueue.push({ ...input, resolvers: [resolve] });
      return;
    }

    queuedKeys.add(key);
    browserQueue.push({ ...input, resolvers: [resolve] });
    debugTranslate("queue", input, {});
    notifyTranslatingCount();
    pumpBrowserQueue();
  });
}

/**
 * Translate lesson/quiz educational content for fr/de/ur/zh.
 * Client: browser gtx only (never hits Worker). Server/SSR: returns English fallback.
 */
export async function translateEducationalContent(
  input: TranslateEducationalInput,
): Promise<TranslateEducationalResult> {
  const trimmed = input.text?.trim() ?? "";
  if (!trimmed) {
    return { text: input.text ?? "", fromCache: false, serviceUnavailable: false };
  }

  if (input.targetLanguage === "en") {
    return { text: trimmed, fromCache: true, serviceUnavailable: false };
  }

  if (input.targetLanguage === "ar" && input.sourceLanguage === "ar") {
    return { text: trimmed, fromCache: true, serviceUnavailable: false };
  }

  const cacheInput = {
    lang: input.targetLanguage,
    contentType: input.contentType,
    lessonId: input.lessonId,
    fieldName: input.fieldName,
    source: trimmed,
  };

  const cached = getCachedEducationalTranslation(cacheInput);
  if (cached) {
    sessionSuccessCount += 1;
    recomputeTranslationAvailability();
    debugTranslate("cache-hit", input, { resultPreview: cached.slice(0, 80) });
    return { text: cached, fromCache: true, serviceUnavailable: false };
  }

  if (typeof window === "undefined") {
    return {
      text: educationalDisplayFallback(trimmed, input.targetLanguage),
      fromCache: false,
      serviceUnavailable: false,
    };
  }

  return enqueueBrowserTranslation({ ...input, text: trimmed });
}

export async function translateEducationalBi(
  bi: Bi,
  targetLanguage: Lang,
  meta: {
    contentType: EducationalContentType;
    lessonId?: string;
    fieldName?: string;
  },
): Promise<TranslateEducationalResult> {
  const stored = resolveStoredBiText(bi, targetLanguage);
  if (stored) {
    return { text: stored, fromCache: true, serviceUnavailable: false };
  }

  const source = biSourceForTranslation(bi, targetLanguage);
  if (!source) return { text: "", fromCache: true, serviceUnavailable: false };

  return translateEducationalContent({
    text: source.text,
    targetLanguage,
    sourceLanguage: source.sourceLanguage,
    contentType: meta.contentType,
    lessonId: meta.lessonId,
    fieldName: meta.fieldName,
  });
}

export function prefetchEducationalTranslations(
  lessonId: string,
  fields: EducationalField[],
  targetLanguage: Lang,
): void {
  if (targetLanguage === "en" || typeof window === "undefined") return;

  for (const field of fields) {
    const trimmed = field.text?.trim();
    if (!trimmed) continue;

    const sourceLanguage =
      field.sourceLanguage ??
      (/[\u0600-\u06FF]/.test(trimmed) && !/[A-Za-z]{4,}/.test(trimmed) ? "ar" : "en");

    if (targetLanguage === sourceLanguage) continue;
    if (targetLanguage === "ar" && sourceLanguage === "ar") continue;

    const scopeId = field.lessonId ?? lessonId;
    const cacheInput = {
      lang: targetLanguage,
      contentType: field.contentType,
      lessonId: scopeId,
      fieldName: field.fieldName,
      source: trimmed,
    };
    if (getCachedEducationalTranslation(cacheInput)) {
      sessionSuccessCount += 1;
      continue;
    }

    const key = buildEducationalCacheKey(cacheInput);
    if ((attemptCounts.get(key) ?? 0) >= MAX_FIELD_ATTEMPTS) continue;
    if (inflightKeys.has(key) || queuedKeys.has(key)) continue;

    void translateEducationalContent({
      text: trimmed,
      targetLanguage,
      contentType: field.contentType,
      lessonId: scopeId,
      fieldName: field.fieldName,
      sourceLanguage,
    });
  }

  recomputeTranslationAvailability();
}

export { contentLocale } from "@/lib/i18n-config";
