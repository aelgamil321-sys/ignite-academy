import type { Lang } from "@/lib/i18n-config";

export type TranslatableLang = Exclude<Lang, "en" | "ar">;

const TARGET_CODES: Record<TranslatableLang, string> = {
  fr: "fr",
  de: "de",
  ur: "ur",
  zh: "zh-CN",
};

export function isTranslationApiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_TRANSLATE_API_KEY);
}

async function googleTranslate(
  text: string,
  target: string,
  source: "en" | "ar",
  apiKey: string,
): Promise<string | null> {
  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, target, source, format: "text" }),
    },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: { translations?: Array<{ translatedText?: string }> };
  };
  return json.data?.translations?.[0]?.translatedText ?? null;
}

async function myMemoryTranslate(
  text: string,
  target: string,
  source: "en" | "ar",
): Promise<string | null> {
  const langpair = `${source}|${target}`;
  const chunk = text.length > 480 ? `${text.slice(0, 480)}…` : text;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${langpair}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  if (json.responseStatus === 429) return null;
  const translated = json.responseData?.translatedText;
  if (!translated || translated === chunk) return null;
  return translated;
}

export type MachineTranslateResult = {
  text: string;
  translated: boolean;
};

/** Server-only machine translation. API keys never leave the worker. */
export async function machineTranslateText(
  text: string,
  targetLang: TranslatableLang,
  sourceLang: "en" | "ar" = "en",
): Promise<MachineTranslateResult> {
  const trimmed = text.trim();
  if (!trimmed) return { text, translated: false };

  const target = TARGET_CODES[targetLang];
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (googleKey) {
    try {
      const result = await googleTranslate(trimmed, target, sourceLang, googleKey);
      if (result && result !== trimmed) {
        return { text: result, translated: true };
      }
    } catch {
      // fall through
    }
  }

  try {
    const result = await myMemoryTranslate(trimmed, target, sourceLang);
    if (result && result !== trimmed) {
      return { text: result, translated: true };
    }
  } catch {
    // fall through
  }

  return { text: trimmed, translated: false };
}

export async function machineTranslateBatch(
  texts: string[],
  targetLang: TranslatableLang,
  sourceLang: "en" | "ar" = "en",
): Promise<{ translations: string[]; anyTranslated: boolean }> {
  const results = await Promise.all(
    texts.map((t) => machineTranslateText(t, targetLang, sourceLang)),
  );
  return {
    translations: results.map((r) => r.text),
    anyTranslated: results.some((r) => r.translated),
  };
}
