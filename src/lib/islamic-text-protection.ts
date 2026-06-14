/** Segment of text that may or may not be machine-translated. */
export type TextSegment = { text: string; protected: boolean };

/** Arabic prefixes that mark Hadith or divine speech — never translate. */
export const ISLAMIC_HADITH_PREFIXES = [
  "قال الله تعالى",
  "قال تعالى",
  "قال رسول الله",
  "عن النبي",
  "عن رسول الله",
  "رواه",
] as const;

/** Ornate Qur'an parentheses U+FD3F … U+FD3E (﴿ … ﴾). */
const QURAN_AYAH_RE = /\uFD3F[\s\S]*?\uFD3E/g;

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

function lineIsProtectedHadith(line: string): boolean {
  const trimmed = line.trimStart();
  if (!trimmed) return false;
  if (ISLAMIC_HADITH_PREFIXES.some((p) => trimmed.startsWith(p))) return true;
  if (trimmed.includes("ﷺ") && ARABIC_RE.test(trimmed)) return true;
  return false;
}

function splitChunkByLines(chunk: string): TextSegment[] {
  if (!chunk) return [];
  const parts = chunk.split(/(\r?\n)/);
  const segments: TextSegment[] = [];
  for (const part of parts) {
    if (part === "\n" || part === "\r\n") {
      segments.push({ text: part, protected: false });
      continue;
    }
    segments.push({ text: part, protected: lineIsProtectedHadith(part) });
  }
  return segments;
}

/**
 * Split text into translatable vs protected Islamic segments.
 * Qur'an ayah markers and Hadith lines stay in original Arabic.
 */
export function splitIslamicProtectedText(text: string): TextSegment[] {
  if (!text) return [{ text: "", protected: false }];

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  QURAN_AYAH_RE.lastIndex = 0;
  while ((match = QURAN_AYAH_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(...splitChunkByLines(text.slice(lastIndex, match.index)));
    }
    segments.push({ text: match[0], protected: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push(...splitChunkByLines(text.slice(lastIndex)));
  }

  return segments.length > 0 ? segments : [{ text, protected: false }];
}

/** True when the string contains Qur'an ayah markers or protected Hadith patterns. */
export function hasProtectedIslamicContent(text: string): boolean {
  if (!text) return false;
  QURAN_AYAH_RE.lastIndex = 0;
  if (QURAN_AYAH_RE.test(text)) return true;
  return splitChunkByLines(text).some((s) => s.protected);
}

/** Reassemble segments after translating only non-protected parts. */
export function mergeProtectedSegments(
  segments: TextSegment[],
  translatedParts: string[],
): string {
  let partIndex = 0;
  return segments
    .map((seg) => {
      if (seg.protected || !seg.text.trim()) return seg.text;
      const next = translatedParts[partIndex];
      partIndex += 1;
      return next ?? seg.text;
    })
    .join("");
}

/** Collect unique non-protected segment strings (preserving order). */
export function translatableSegments(segments: TextSegment[]): string[] {
  return segments.filter((s) => !s.protected && s.text.trim()).map((s) => s.text);
}
