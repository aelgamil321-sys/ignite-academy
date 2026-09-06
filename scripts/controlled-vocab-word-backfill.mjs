/**
 * Controlled real repair: fill missing vocab.word slots for one lesson (OpenAI allowed).
 * Run: node scripts/controlled-vocab-word-backfill.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const LESSON_ID = process.env.VOCAB_BACKFILL_LESSON_ID ?? "b36a233a-fd91-4378-96b9-07ca48e5c69e";
const LANGS = ["ar", "en", "fr", "de", "ur", "zh"];
const TARGET_LANGS = ["en", "fr", "de", "ur", "zh"];

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvFile(join(root, ".env"));

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LATIN_RE = /[A-Za-z]/;
const CJK_RE = /[\u4E00-\u9FFF]/;

function parseLocalizedText(raw) {
  const out = Object.fromEntries(LANGS.map((lang) => [lang, ""]));
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const lang of LANGS) {
      if (raw[lang] !== undefined) out[lang] = String(raw[lang] ?? "");
    }
  }
  return out;
}

function isLessonLangSlotMissing(text, lang) {
  const value = parseLocalizedText(text)[lang]?.trim() ?? "";
  if (!value) return true;
  if (lang === "ar" || lang === "ur") return LATIN_RE.test(value) && !ARABIC_RE.test(value);
  if (lang === "zh") return !CJK_RE.test(value) && LATIN_RE.test(value);
  if (lang === "en" || lang === "fr" || lang === "de") return ARABIC_RE.test(value) && !LATIN_RE.test(value);
  return false;
}

function isWordSlotMissing(word, lang) {
  const value = parseLocalizedText(word)[lang]?.trim() ?? "";
  if (!value) return true;
  const ar = parseLocalizedText(word).ar?.trim() ?? "";
  if (lang !== "ar" && ar && value === ar) return true;
  return isLessonLangSlotMissing(word, lang);
}

function countMissingWordSlots(vocab) {
  let count = 0;
  for (const item of vocab) {
    for (const lang of TARGET_LANGS) {
      if (isWordSlotMissing(item.word, lang)) count += 1;
    }
  }
  return count;
}

function parseVocab(raw) {
  if (!raw || typeof raw !== "object") return { items: [] };
  const sourceItems = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [];
  return {
    items: sourceItems.map((item) => ({
      word: parseLocalizedText(item?.word ?? item?.term),
      meaning: parseLocalizedText(item?.meaning ?? item?.def),
    })),
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function googleTranslateTerm(sourceAr, targetLang, attempt = 1) {
  const target = { en: "en", fr: "fr", de: "de", ur: "ur", zh: "zh-CN" }[targetLang];
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (apiKey) {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: sourceAr, target, source: "ar", format: "text" }),
      },
    );
    if (res.ok) {
      const json = await res.json();
      const text = json.data?.translations?.[0]?.translatedText?.trim();
      if (text) return text;
    }
  }

  const q = encodeURIComponent(sourceAr);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=${target}&dt=t&q=${q}`;
  const res = await fetch(url, {
    headers: {
      Accept: "*/*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    if (attempt < 4) {
      await sleep(1500 * attempt);
      return googleTranslateTerm(sourceAr, targetLang, attempt + 1);
    }
    throw new Error(`Google translate HTTP ${res.status}`);
  }
  const json = await res.json();
  const parts = (json?.[0] ?? []).map((row) => row?.[0]).filter(Boolean);
  const text = parts.join("").trim();
  if (!text) throw new Error("Empty Google translate response");
  return text;
}

function isAcceptedVocabTranslation(text, sourceAr, targetLang) {
  const value = text?.trim() ?? "";
  if (!value) return false;
  if (value === sourceAr.trim()) return false;
  if (targetLang !== "ar" && isWordSlotMissing({ ar: sourceAr, [targetLang]: value }, targetLang)) {
    return false;
  }
  return true;
}

async function translateVocabTerm(sourceAr, targetLang) {
  const apiKey = process.env.OPENAI_API_KEY;
  const langLabel = {
    en: "English",
    fr: "French",
    de: "German",
    ur: "Urdu (Urdu script, not Arabic copy)",
    zh: "Simplified Chinese",
  }[targetLang];

  if (apiKey) {
    const model = "gpt-4o-mini";
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "Translate Islamic/Qur'anic vocabulary terms for a school lesson. Return ONLY the translated term in the target language/script. Never repeat the Arabic source.",
            },
            {
              role: "user",
              content: `Arabic term: ${sourceAr}\nTarget language: ${langLabel}\nProvide a concise classroom vocabulary term translation. Do not output Arabic.`,
            },
          ],
        }),
      });

      if (res.ok) {
        const body = await res.json();
        const text = body.choices?.[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, "");
        if (text && isAcceptedVocabTranslation(text, sourceAr, targetLang)) {
          return { text, provider: "openai" };
        }
      }
      await sleep(400 * attempt);
    }
  }

  const fallback = await googleTranslateTerm(sourceAr, targetLang);
  if (!isAcceptedVocabTranslation(fallback, sourceAr, targetLang)) {
    throw new Error(`Rejected vocab translation for ${targetLang}: identical or invalid script`);
  }
  return { text: fallback, provider: "google" };
}

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && serviceKey, "Supabase env required");

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: row, error } = await admin
  .from("lessons")
  .select("vocab")
  .eq("id", LESSON_ID)
  .maybeSingle();
assert.ifError(error);
assert.ok(row, "lesson must exist");

const vocabPayload = parseVocab(row.vocab);
const beforeMissing = countMissingWordSlots(vocabPayload.items);
console.log(JSON.stringify({ lessonId: LESSON_ID, missing_vocab_term_slots_before: beforeMissing }, null, 2));

if (beforeMissing === 0) {
  console.log("Nothing to backfill.");
  process.exit(0);
}

const originalArValues = vocabPayload.items.map((item) => parseLocalizedText(item.word).ar);

let openAiCalls = 0;
let googleCalls = 0;
const requested = [];

for (const [index, item] of vocabPayload.items.entries()) {
  const sourceAr = parseLocalizedText(item.word).ar?.trim();
  if (!sourceAr) continue;
  const originalAr = sourceAr;

  for (const lang of TARGET_LANGS) {
    if (!isWordSlotMissing(item.word, lang)) continue;
    requested.push({ index, lang });
    const result = await translateVocabTerm(sourceAr, lang);
    if (result.provider === "openai") openAiCalls += 1;
    else googleCalls += 1;
    item.word = { ...parseLocalizedText(item.word), [lang]: result.text, ar: originalAr };
    await sleep(350);
  }
}

const afterMissing = countMissingWordSlots(vocabPayload.items);

const serialized = {
  items: vocabPayload.items.map((item) => ({
    word: parseLocalizedText(item.word),
    meaning: parseLocalizedText(item.meaning),
  })),
};

const { error: updateError } = await admin.from("lessons").update({ vocab: serialized }).eq("id", LESSON_ID);
assert.ifError(updateError);


console.log(
  JSON.stringify(
    {
      lessonId: LESSON_ID,
      requested_translations: requested.length,
      completed: requested.length,
      missing_vocab_term_slots_after: afterMissing,
      openAiCalls,
      googleTranslateFallbackCalls: googleCalls,
      estimatedCostUsd: Number((openAiCalls * 0.00015).toFixed(4)),
      word_ar_preserved: serialized.items.every(
        (item, i) => item.word.ar === originalArValues[i],
      ),
    },
    null,
    2,
  ),
);

console.log("controlled-vocab-word-backfill: done");
