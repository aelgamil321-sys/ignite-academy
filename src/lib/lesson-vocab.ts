import type { Bi } from "./curriculum";

export interface VocabularyItem {
  word: Bi;
  meaning: Bi;
}

const LEGACY_SPLIT = /[,،;；\-\u2013\u2014]+/;

export function splitLegacyVocabText(text: string): string[] {
  return (text ?? "")
    .split(LEGACY_SPLIT)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBiField(raw: unknown): Bi {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return { en: String(o.en ?? ""), ar: String(o.ar ?? "") };
  }
  if (typeof raw === "string") return { en: raw, ar: "" };
  return { en: "", ar: "" };
}

function normalizeItem(raw: unknown): VocabularyItem {
  if (!raw || typeof raw !== "object") {
    return emptyVocabItem();
  }
  const o = raw as Record<string, unknown>;
  return {
    word: parseBiField(o.word ?? o.term),
    meaning: parseBiField(o.meaning ?? o.def),
  };
}

function legacyBiToItems(b: Bi): VocabularyItem[] {
  const en = splitLegacyVocabText(b.en);
  const ar = splitLegacyVocabText(b.ar);
  const n = Math.max(en.length, ar.length);
  if (n === 0) return [];
  return Array.from({ length: n }, (_, i) => ({
    word: { en: en[i] ?? "", ar: ar[i] ?? "" },
    meaning: { en: "", ar: "" },
  }));
}

/** Parse structured or legacy vocabulary JSON without mutating stored data. */
export function parseVocabFromStorage(raw: unknown): VocabularyItem[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map(normalizeItem).filter(hasVocabWord);
  }

  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.items)) {
      return o.items.map(normalizeItem).filter(hasVocabWord);
    }
    if ("en" in o || "ar" in o) {
      return legacyBiToItems({ en: String(o.en ?? ""), ar: String(o.ar ?? "") });
    }
  }

  return [];
}

export function serializeVocabForStorage(items: VocabularyItem[]): { items: VocabularyItem[] } {
  return {
    items: items
      .map((item) => ({
        word: { en: item.word.en.trim(), ar: item.word.ar.trim() },
        meaning: { en: item.meaning.en.trim(), ar: item.meaning.ar.trim() },
      }))
      .filter(hasVocabWord),
  };
}

export function emptyVocabItem(): VocabularyItem {
  return { word: { en: "", ar: "" }, meaning: { en: "", ar: "" } };
}

export function hasVocabWord(item: VocabularyItem): boolean {
  return Boolean(item.word.en?.trim() || item.word.ar?.trim());
}

/** Word shown on the front of a flip card for the active UI language. */
export function pickVocabWordBi(item: VocabularyItem, lang: "en" | "ar"): Bi {
  if (lang === "ar") {
    const ar = item.word.ar?.trim() || item.word.en?.trim() || "";
    return { en: ar, ar };
  }
  const en = item.word.en?.trim() || item.word.ar?.trim() || "";
  return { en, ar: item.word.ar?.trim() ?? "" };
}

/** Meaning shown on the back of a flip card for the active UI language. */
export function pickVocabMeaningBi(item: VocabularyItem, lang: "en" | "ar"): Bi {
  if (lang === "ar") {
    const ar = item.meaning.ar?.trim() || item.meaning.en?.trim() || "";
    return { en: ar, ar };
  }
  const en = item.meaning.en?.trim() || item.meaning.ar?.trim() || "";
  return { en, ar: item.meaning.ar?.trim() ?? "" };
}

export function hasVocabMeaning(item: VocabularyItem, lang: "en" | "ar"): boolean {
  const m = pickVocabMeaningBi(item, lang);
  return Boolean(m.en?.trim() || m.ar?.trim());
}
