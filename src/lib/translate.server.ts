import type { Lang } from "@/lib/i18n-config";

export type TranslatableLang = Exclude<Lang, "en" | "ar">;

/** Google / MyMemory language codes. */
const TARGET_CODES: Record<TranslatableLang, string> = {
  fr: "fr",
  de: "de",
  ur: "ur",
  zh: "zh-CN",
};

/** MyMemory uses slightly different codes for some targets. */
const MYMEMORY_TARGET: Record<TranslatableLang, string> = {
  fr: "fr",
  de: "de",
  ur: "ur",
  zh: "zh-CN",
};

const FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent": "IgniteIslamicAcademy/1.0 (educational; translate)",
};

export function isTranslationApiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY);
}

async function googleTranslateApi(
  text: string,
  target: string,
  source: "en" | "ar",
  apiKey: string,
): Promise<string | null> {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...FETCH_HEADERS },
      body: JSON.stringify({ q: text, target, source, format: "text" }),
    },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: { translations?: Array<{ translatedText?: string }> };
  };
  const out = json.data?.translations?.[0]?.translatedText?.trim();
  return out && out !== text ? out : null;
}

/** Unofficial Google Translate endpoint — server-only fallback when no API key. */
async function googleTranslateGtx(
  text: string,
  target: string,
  source: "en" | "ar",
): Promise<string | null> {
  const chunk = text.length > 4500 ? text.slice(0, 4500) : text;
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx` +
    `&sl=${encodeURIComponent(source)}` +
    `&tl=${encodeURIComponent(target)}` +
    `&dt=t&q=${encodeURIComponent(chunk)}`;
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) return null;
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json) || !Array.isArray(json[0])) return null;
  const parts = (json[0] as Array<[string, ...unknown[]]>)
    .map((row) => row[0])
    .filter(Boolean);
  const out = parts.join("").trim();
  return out && out !== chunk ? out : null;
}

async function myMemoryTranslate(
  text: string,
  target: string,
  source: "en" | "ar",
): Promise<string | null> {
  const langpair = `${source}|${target}`;
  const chunk = text.length > 480 ? text.slice(0, 480) : text;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(langpair)}`;
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    responseStatus?: number;
    quotaFinished?: boolean;
    responseData?: { translatedText?: string };
  };
  if (json.responseStatus === 429 || json.quotaFinished) return null;
  const translated = json.responseData?.translatedText?.trim();
  if (!translated || translated === chunk) return null;
  return translated;
}

export type MachineTranslateResult = {
  text: string;
  translated: boolean;
  provider?: "google-api" | "google-gtx" | "mymemory" | "none";
};

/** Server-only machine translation. API keys never leave the worker. */
export async function machineTranslateText(
  text: string,
  targetLang: TranslatableLang,
  sourceLang: "en" | "ar" = "en",
): Promise<MachineTranslateResult> {
  const trimmed = text.trim();
  if (!trimmed) return { text, translated: false, provider: "none" };

  const target = TARGET_CODES[targetLang];
  const mmTarget = MYMEMORY_TARGET[targetLang];
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;

  if (googleKey) {
    try {
      const result = await googleTranslateApi(trimmed, target, sourceLang, googleKey);
      if (result) return { text: result, translated: true, provider: "google-api" };
    } catch {
      // fall through
    }
  }

  try {
    const result = await myMemoryTranslate(trimmed, mmTarget, sourceLang);
    if (result) return { text: result, translated: true, provider: "mymemory" };
  } catch {
    // fall through
  }

  try {
    const result = await googleTranslateGtx(trimmed, target, sourceLang);
    if (result) return { text: result, translated: true, provider: "google-gtx" };
  } catch {
    // fall through
  }

  return { text: trimmed, translated: false, provider: "none" };
}

export async function machineTranslateBatch(
  texts: string[],
  targetLang: TranslatableLang,
  sourceLang: "en" | "ar" = "en",
): Promise<{ translations: string[]; anyTranslated: boolean; providers: string[] }> {
  const results = await Promise.all(
    texts.map((t) => machineTranslateText(t, targetLang, sourceLang)),
  );
  return {
    translations: results.map((r) => r.text),
    anyTranslated: results.some((r) => r.translated),
    providers: [...new Set(results.map((r) => r.provider ?? "none"))],
  };
}
