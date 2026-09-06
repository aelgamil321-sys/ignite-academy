import type { Bi, QuizQuestion } from "@/lib/curriculum";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import {
  LESSON_LANGS,
  type LessonLang,
  parseLocalizedText,
  mergeLocalizedTexts,
  serializeLocalizedText,
} from "@/lib/lesson-localized";
import { isLessonLangSlotMissing } from "@/lib/lesson-multilingual-resolve";
import { isVocabWordLangSlotMissing } from "@/lib/lesson-vocab-localization";

export type MissingLocalizedSlot = {
  path: string;
  lang: LessonLang;
};

export type LocalizedCompletenessReport = {
  missing: MissingLocalizedSlot[];
  complete: boolean;
};

function pushBiMissing(
  missing: MissingLocalizedSlot[],
  path: string,
  bi: Bi | undefined,
  langs: readonly LessonLang[] = LESSON_LANGS,
) {
  for (const lang of langs) {
    if (isLessonLangSlotMissing(bi, lang)) {
      missing.push({ path: `${path}.${lang}`, lang });
    }
  }
}

/** Field-by-field missing slot scan for a lesson-shaped object. OpenAI-free. */
export function collectLessonMissingLocalizedSlots(input: {
  title?: Bi;
  unit?: Bi;
  outcome?: Bi;
  explanation?: Bi;
  subject?: Bi;
  vocab?: VocabularyItem[];
  quiz?: QuizQuestion[];
  sourceLanguageHint?: "en" | "ar";
}): LocalizedCompletenessReport {
  const missing: MissingLocalizedSlot[] = [];
  pushBiMissing(missing, "title", input.title);
  pushBiMissing(missing, "unit", input.unit);
  pushBiMissing(missing, "outcome", input.outcome);
  pushBiMissing(missing, "explanation", input.explanation);

  (input.vocab ?? []).forEach((item, index) => {
    for (const lang of LESSON_LANGS) {
      if (isVocabWordLangSlotMissing(item.word, lang)) {
        missing.push({ path: `vocab[${index}].word.${lang}`, lang });
      }
    }
    pushBiMissing(missing, `vocab[${index}].meaning`, item.meaning);
  });

  (input.quiz ?? []).forEach((question, index) => {
    pushBiMissing(missing, `quiz[${index}].question`, question.question);
    (question.options ?? []).forEach((option, optionIndex) => {
      pushBiMissing(missing, `quiz[${index}].options[${optionIndex}]`, option);
    });
    if (question.type === "essay" && question.modelAnswer) {
      pushBiMissing(missing, `quiz[${index}].modelAnswer`, question.modelAnswer);
    }
  });

  return { missing, complete: missing.length === 0 };
}

/** Merge AI/backfill output without overwriting existing non-empty slots. */
export function mergeMissingLocalizedSlotsOnly(
  base: Bi,
  incoming: Partial<Record<LessonLang, string>>,
): Bi {
  const parsed = parseLocalizedText(base);
  const patch: Partial<Record<LessonLang, string>> = {};
  for (const lang of LESSON_LANGS) {
    if (isLessonLangSlotMissing(parsed, lang) && incoming[lang]?.trim()) {
      patch[lang] = incoming[lang]!.trim();
    }
  }
  return serializeLocalizedText(mergeLocalizedTexts(parsed, patch));
}

/** Assignment fields → six-language Bi (jsonb first, legacy en/ar fallback). */
export function assignmentBiFromColumns(input: {
  title?: unknown;
  title_en?: string | null;
  title_ar?: string | null;
  instructions?: unknown;
  instructions_en?: string | null;
  instructions_ar?: string | null;
}): { title: Bi; instructions: Bi } {
  return {
    title: readLocalizedFieldWithLegacyFallback(input.title, input.title_en, input.title_ar),
    instructions: readLocalizedFieldWithLegacyFallback(
      input.instructions,
      input.instructions_en,
      input.instructions_ar,
    ),
  };
}

function readLocalizedFieldWithLegacyFallback(
  jsonb: unknown,
  legacyEn: string | null | undefined,
  legacyAr: string | null | undefined,
): Bi {
  const fromJsonb = parseLocalizedText(jsonb);
  const jsonbHasStoredText = LESSON_LANGS.some((lang) => Boolean(fromJsonb[lang]?.trim()));
  if (jsonbHasStoredText) {
    return fromJsonb;
  }
  return parseLocalizedText({
    en: legacyEn?.trim() ?? "",
    ar: legacyAr?.trim() ?? "",
  });
}

/** Read jsonb LocalizedText first; fall back to legacy en/ar columns when jsonb is empty. */
export { readLocalizedFieldWithLegacyFallback };

/** Field-by-field missing slot scan for assignment title/instructions. OpenAI-free. */
export function collectAssignmentMissingLocalizedSlots(input: {
  title?: Bi;
  instructions?: Bi;
}): LocalizedCompletenessReport {
  const missing: MissingLocalizedSlot[] = [];
  pushBiMissing(missing, "title", input.title);
  pushBiMissing(missing, "instructions", input.instructions);
  return { missing, complete: missing.length === 0 };
}

/** Field-by-field missing slot scan for notification title/body. OpenAI-free. */
export function collectNotificationMissingLocalizedSlots(input: {
  title?: Bi;
  body?: Bi;
}): LocalizedCompletenessReport {
  const missing: MissingLocalizedSlot[] = [];
  pushBiMissing(missing, "title", input.title);
  pushBiMissing(missing, "body", input.body);
  return { missing, complete: missing.length === 0 };
}

/** Field-by-field missing slot scan for weekly plan master list labels. OpenAI-free. */
export function collectWeeklyPlanLabelMissingLocalizedSlots(input: {
  label?: Bi;
}): LocalizedCompletenessReport {
  const missing: MissingLocalizedSlot[] = [];
  pushBiMissing(missing, "label", input.label);
  return { missing, complete: missing.length === 0 };
}
