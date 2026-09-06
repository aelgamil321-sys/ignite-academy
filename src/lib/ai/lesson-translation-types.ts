import { z } from "zod";
import {
  mcQuestionSchema,
  tfQuestionSchema,
  essayQuestionSchema,
} from "@/lib/ai/lesson-generation-types";
import type { LessonLang } from "@/lib/lesson-localized";
import { LESSON_LANGS } from "@/lib/lesson-localized";

const translatedLanguageLessonSchema = z.object({
  lesson_title: z.string().min(1),
  learning_outcome: z.string().min(1),
  lesson_summary: z.string().min(1),
  vocabulary: z
    .array(
      z.object({
        term: z.string().min(1),
        synonym_or_simple_meaning: z.string().min(1),
      }),
    )
    .min(5)
    .max(10),
  quiz: z.object({
    multiple_choice: z.array(mcQuestionSchema).length(4),
    true_false: z.array(tfQuestionSchema).length(4),
    essay: z.array(essayQuestionSchema).length(2),
  }),
});

export type TranslatedLanguageLesson = z.infer<typeof translatedLanguageLessonSchema>;

export function translationTargetLangs(sourceLanguage: "en" | "ar"): LessonLang[] {
  return LESSON_LANGS.filter((lang) => lang !== sourceLanguage);
}

/** Two bounded translation chunks — avoids single-call structured output truncation. */
export function translationLangChunks(sourceLanguage: "en" | "ar"): LessonLang[][] {
  if (sourceLanguage === "en") {
    return [
      ["ar", "fr", "de"],
      ["ur", "zh"],
    ];
  }
  return [
    ["en", "fr", "de"],
    ["ur", "zh"],
  ];
}

export function buildLessonTranslationOutputSchema(sourceLanguage: "en" | "ar") {
  return buildPartialLessonTranslationOutputSchema(sourceLanguage, translationTargetLangs(sourceLanguage));
}

export function buildPartialLessonTranslationOutputSchema(
  sourceLanguage: "en" | "ar",
  targetLangs: LessonLang[],
) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const lang of targetLangs) {
    if (lang === sourceLanguage) continue;
    shape[lang] = translatedLanguageLessonSchema;
  }
  return z.object(shape);
}

export type LessonTranslationOutput = z.infer<ReturnType<typeof buildLessonTranslationOutputSchema>>;

export const LESSON_TRANSLATION_SCHEMA_NAME = "ignite_lesson_translation_output";

export const LESSON_TRANSLATION_SYSTEM_PROMPT = `You are a professional educational translator for Ignite Islamic Academy (Islamic Studies).

RULES:
- Translate classroom-friendly lesson content into the requested target languages.
- Do NOT change quiz semantics: keep the SAME multiple-choice correctAnswer indexes (0–3) and the SAME true/false boolean answers.
- Do NOT add, remove, or reorder quiz questions or vocabulary items.
- Preserve Islamic proper nouns and recognized transliterations where appropriate.
- For vocabulary TERM fields: translate each term into the target language (English/French/German/Urdu/Chinese as appropriate). Keep the original Arabic term ONLY in the Arabic vocabulary term field.
- Qur'an or Hadith Arabic source wording in lesson body fields must remain in Arabic in the Arabic field only — never copy untranslated Arabic terms into en/fr/de/ur/zh vocabulary term slots.
- Use clear Modern Standard Arabic (ar), school-level English (en), educational French (fr), German (de), natural Urdu script (ur), and Simplified Chinese (zh).
- Urdu must be in Urdu script, not Roman Urdu.
- Translate explanations and grading guides faithfully without inventing new facts.`;
