import type { Bi, QuizQuestion } from "@/lib/curriculum";
import { TRUE_FALSE_OPTIONS } from "@/lib/lesson-quiz";
import { hasProtectedIslamicContent } from "@/lib/islamic-text-protection";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import type { LessonAiOutput, LessonGenerationMappedResult, LessonGenerationMetadata } from "@/lib/ai/lesson-generation-types";
import { lessonAiOutputSchema } from "@/lib/ai/lesson-generation-types";

function biForSource(text: string, sourceLanguage: "en" | "ar"): Bi {
  const trimmed = text.trim();
  return sourceLanguage === "ar" ? { en: "", ar: trimmed } : { en: trimmed, ar: "" };
}

function clampMcAnswerIndex(correctAnswer: number): number {
  return Math.min(Math.max(0, correctAnswer), 3);
}

export function mapLessonAiOutputToLessonFields(
  output: LessonAiOutput,
  sourceLanguage: "en" | "ar",
  metadataBase: Omit<LessonGenerationMetadata, "warnings" | "needsReview">,
): LessonGenerationMappedResult {
  const warnings = [...(output.warnings ?? [])];
  const sacredTexts = [
    output.lesson_summary,
    ...output.vocabulary.map((v) => `${v.term} ${v.synonym_or_simple_meaning}`),
    ...output.quiz.multiple_choice.map((q) => q.question),
    ...output.quiz.true_false.map((q) => q.statement),
    ...output.quiz.essay.map((q) => q.question),
  ];

  if (sacredTexts.some((t) => hasProtectedIslamicContent(t))) {
    warnings.push("Sacred-text verification recommended");
  }

  const explanation = biForSource(output.lesson_summary, sourceLanguage);

  const vocab: VocabularyItem[] = output.vocabulary.map((item) => ({
    word: biForSource(item.term, sourceLanguage),
    meaning: biForSource(item.synonym_or_simple_meaning, sourceLanguage),
  }));

  const quiz: QuizQuestion[] = [];

  for (const mc of output.quiz.multiple_choice.slice(0, 4)) {
    const options = mc.options.map((opt) => biForSource(opt, sourceLanguage));
    quiz.push({
      q: biForSource(mc.question, sourceLanguage),
      type: "multiple_choice",
      options,
      answer: clampMcAnswerIndex(mc.correctAnswer),
      points: 1,
    });
  }

  for (const tf of output.quiz.true_false.slice(0, 4)) {
    quiz.push({
      q: biForSource(tf.statement, sourceLanguage),
      type: "true_false",
      options: TRUE_FALSE_OPTIONS.map((o) => ({ ...o })),
      answer: tf.correctAnswer ? 0 : 1,
      points: 1,
    });
  }

  for (const essay of output.quiz.essay.slice(0, 2)) {
    const guide = essay.gradingGuide?.trim() || essay.modelAnswer?.trim() || "";
    quiz.push({
      q: biForSource(essay.question, sourceLanguage),
      type: "essay",
      options: [],
      answer: 0,
      points: 5,
      modelAnswer: guide ? biForSource(guide, sourceLanguage) : undefined,
    });
  }

  const needsReview = warnings.length > 0;

  return {
    explanation,
    vocab,
    quiz,
    metadata: {
      ...metadataBase,
      warnings,
      needsReview,
    },
  };
}

export function parseLessonAiJson(raw: string): { ok: true; data: LessonAiOutput } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const data = lessonAiOutputSchema.parse(parsed);
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid AI JSON";
    return { ok: false, error: message };
  }
}
