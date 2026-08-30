import { z } from "zod";
import {
  mcQuestionSchema,
  tfQuestionSchema,
  essayQuestionSchema,
} from "@/lib/ai/lesson-generation-types";

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

export function buildLessonTranslationOutputSchema(sourceLanguage: "en" | "ar") {
  const shape: Record<string, z.ZodTypeAny> = {
    fr: translatedLanguageLessonSchema,
    de: translatedLanguageLessonSchema,
    ur: translatedLanguageLessonSchema,
    zh: translatedLanguageLessonSchema,
  };
  if (sourceLanguage === "en") {
    shape.ar = translatedLanguageLessonSchema;
  } else {
    shape.en = translatedLanguageLessonSchema;
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
- NEVER translate or rewrite Qur'an or Hadith Arabic source text. If sacred Arabic appears in the source, preserve it EXACTLY in Arabic fields and do not paraphrase it in other languages.
- Use clear Modern Standard Arabic (ar), school-level English (en), educational French (fr), German (de), natural Urdu script (ur), and Simplified Chinese (zh).
- Urdu must be in Urdu script, not Roman Urdu.
- Translate explanations and grading guides faithfully without inventing new facts.`;
