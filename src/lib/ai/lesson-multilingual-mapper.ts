import type { Bi, QuizQuestion } from "@/lib/curriculum";
import { TRUE_FALSE_OPTIONS } from "@/lib/lesson-quiz";
import { hasProtectedIslamicContent, classifyIslamicTextContent } from "@/lib/islamic-text-protection";
import { LESSON_GENERATION_WARNING } from "@/lib/lesson-generation-warnings";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import {
  type LessonLang,
  LESSON_LANGS,
  mergeLocalizedTexts,
  localizedFromSource,
  serializeLocalizedText,
} from "@/lib/lesson-localized";
import type {
  LessonAiOutput,
  LessonGenerationMappedResult,
  LessonGenerationMetadata,
} from "@/lib/ai/lesson-generation-types";
import type { LessonTranslationOutput, TranslatedLanguageLesson } from "@/lib/ai/lesson-translation-types";

function clampMcAnswerIndex(correctAnswer: number): number {
  return Math.min(Math.max(0, correctAnswer), 3);
}

function localizedField(sourceLang: "en" | "ar", sourceText: string, translations: Partial<Record<LessonLang, string>>): Bi {
  const base = localizedFromSource(sourceText, sourceLang);
  return serializeLocalizedText(mergeLocalizedTexts(base, translations));
}

export function buildSourceLessonPayload(input: {
  lessonTitle: string;
  unitNumber: string;
  learningOutcome: string;
  source: LessonAiOutput;
}): Record<string, unknown> {
  return {
    lesson_title: input.lessonTitle,
    unit_number: input.unitNumber,
    learning_outcome: input.learningOutcome,
    lesson_summary: input.source.lesson_summary,
    vocabulary: input.source.vocabulary,
    quiz: input.source.quiz,
    warnings: input.source.warnings,
  };
}

export function mapMultilingualLessonFields(input: {
  source: LessonAiOutput;
  sourceLanguage: "en" | "ar";
  lessonTitle: string;
  unitNumber: string;
  learningOutcome: string;
  translations: LessonTranslationOutput | null;
  metadataBase: Omit<LessonGenerationMetadata, "warnings" | "needsReview" | "translationComplete" | "translationError">;
  translationComplete: boolean;
  translationError?: string;
}): LessonGenerationMappedResult {
  const warnings = [...(input.source.warnings ?? [])];
  const sacredTexts = [
    input.source.lesson_summary,
    ...input.source.vocabulary.map((v) => `${v.term} ${v.synonym_or_simple_meaning}`),
    ...input.source.quiz.multiple_choice.map((q) => q.question),
    ...input.source.quiz.true_false.map((q) => q.statement),
    ...input.source.quiz.essay.map((q) => q.question),
  ];

  if (sacredTexts.some((t) => classifyIslamicTextContent(t) === "corrupted")) {
    warnings.push(LESSON_GENERATION_WARNING.SACRED_TEXT_CORRUPTED);
  } else if (sacredTexts.some((t) => hasProtectedIslamicContent(t))) {
    warnings.push(LESSON_GENERATION_WARNING.SACRED_TEXT_REVIEW);
  }
  if (!input.translationComplete) {
    warnings.push(LESSON_GENERATION_WARNING.TRANSLATION_INCOMPLETE);
  }

  const titleByLang: Partial<Record<LessonLang, string>> = {};
  const outcomeByLang: Partial<Record<LessonLang, string>> = {};
  const unitByLang: Partial<Record<LessonLang, string>> = {};
  const summaryByLang: Partial<Record<LessonLang, string>> = {
    [input.sourceLanguage]: input.source.lesson_summary,
  };

  titleByLang[input.sourceLanguage] = input.lessonTitle;
  outcomeByLang[input.sourceLanguage] = input.learningOutcome;
  const unitCanonical = input.unitNumber.trim();
  for (const lang of LESSON_LANGS) {
    unitByLang[lang] = unitCanonical;
  }

  if (input.translations) {
    for (const lang of LESSON_LANGS) {
      if (lang === input.sourceLanguage) continue;
      const block = input.translations[lang as keyof LessonTranslationOutput] as TranslatedLanguageLesson | undefined;
      if (!block) continue;
      titleByLang[lang] = block.lesson_title;
      outcomeByLang[lang] = block.learning_outcome;
      summaryByLang[lang] = block.lesson_summary;
    }
  }

  const title = localizedField(input.sourceLanguage, input.lessonTitle, titleByLang);
  const outcome = localizedField(input.sourceLanguage, input.learningOutcome, outcomeByLang);
  const unit = localizedField(input.sourceLanguage, input.unitNumber, unitByLang);
  const explanation = localizedField(input.sourceLanguage, input.source.lesson_summary, summaryByLang);

  const vocabCount = input.source.vocabulary.length;
  const vocab: VocabularyItem[] = input.source.vocabulary.map((item, index) => {
    const wordByLang: Partial<Record<LessonLang, string>> = {
      [input.sourceLanguage]: item.term,
    };
    const meaningByLang: Partial<Record<LessonLang, string>> = {
      [input.sourceLanguage]: item.synonym_or_simple_meaning,
    };
    if (input.translations) {
      for (const lang of LESSON_LANGS) {
        if (lang === input.sourceLanguage) continue;
        const block = input.translations[lang as keyof LessonTranslationOutput] as TranslatedLanguageLesson | undefined;
        const translated = block?.vocabulary[index];
        if (!translated) continue;
        wordByLang[lang] = translated.term;
        meaningByLang[lang] = translated.synonym_or_simple_meaning;
      }
    }
    return {
      word: localizedField(input.sourceLanguage, item.term, wordByLang),
      meaning: localizedField(input.sourceLanguage, item.synonym_or_simple_meaning, meaningByLang),
    };
  });

  const quiz: QuizQuestion[] = [];

  for (let i = 0; i < input.source.quiz.multiple_choice.length && i < 4; i++) {
    const mc = input.source.quiz.multiple_choice[i];
    const qByLang: Partial<Record<LessonLang, string>> = { [input.sourceLanguage]: mc.question };
    const optionSets: Partial<Record<LessonLang, string[]>> = {
      [input.sourceLanguage]: mc.options,
    };
    if (input.translations) {
      for (const lang of LESSON_LANGS) {
        if (lang === input.sourceLanguage) continue;
        const block = input.translations[lang as keyof LessonTranslationOutput] as TranslatedLanguageLesson | undefined;
        const translated = block?.quiz.multiple_choice[i];
        if (!translated) continue;
        qByLang[lang] = translated.question;
        optionSets[lang] = translated.options;
      }
    }
    const options = mc.options.map((_, optIndex) => {
      const byLang: Partial<Record<LessonLang, string>> = {
        [input.sourceLanguage]: mc.options[optIndex],
      };
      for (const lang of LESSON_LANGS) {
        if (lang === input.sourceLanguage) continue;
        const opts = optionSets[lang];
        if (opts?.[optIndex]) byLang[lang] = opts[optIndex];
      }
      return localizedField(input.sourceLanguage, mc.options[optIndex], byLang);
    });
    quiz.push({
      q: localizedField(input.sourceLanguage, mc.question, qByLang),
      type: "multiple_choice",
      options,
      answer: clampMcAnswerIndex(mc.correctAnswer),
      points: 1,
    });
  }

  for (let i = 0; i < input.source.quiz.true_false.length && i < 4; i++) {
    const tf = input.source.quiz.true_false[i];
    const qByLang: Partial<Record<LessonLang, string>> = { [input.sourceLanguage]: tf.statement };
    if (input.translations) {
      for (const lang of LESSON_LANGS) {
        if (lang === input.sourceLanguage) continue;
        const block = input.translations[lang as keyof LessonTranslationOutput] as TranslatedLanguageLesson | undefined;
        const translated = block?.quiz.true_false[i];
        if (translated) qByLang[lang] = translated.statement;
      }
    }
    quiz.push({
      q: localizedField(input.sourceLanguage, tf.statement, qByLang),
      type: "true_false",
      options: TRUE_FALSE_OPTIONS.map((o) => ({ ...o })),
      answer: tf.correctAnswer ? 0 : 1,
      points: 1,
    });
  }

  for (let i = 0; i < input.source.quiz.essay.length && i < 2; i++) {
    const essay = input.source.quiz.essay[i];
    const guide = essay.gradingGuide?.trim() || essay.modelAnswer?.trim() || "";
    const qByLang: Partial<Record<LessonLang, string>> = { [input.sourceLanguage]: essay.question };
    const modelByLang: Partial<Record<LessonLang, string>> = { [input.sourceLanguage]: guide };
    if (input.translations) {
      for (const lang of LESSON_LANGS) {
        if (lang === input.sourceLanguage) continue;
        const block = input.translations[lang as keyof LessonTranslationOutput] as TranslatedLanguageLesson | undefined;
        const translated = block?.quiz.essay[i];
        if (!translated) continue;
        qByLang[lang] = translated.question;
        modelByLang[lang] = translated.gradingGuide?.trim() || translated.modelAnswer?.trim() || "";
      }
    }
    quiz.push({
      q: localizedField(input.sourceLanguage, essay.question, qByLang),
      type: "essay",
      options: [],
      answer: 0,
      points: 5,
      modelAnswer: guide ? localizedField(input.sourceLanguage, guide, modelByLang) : undefined,
    });
  }

  const needsReview = warnings.length > 0;

  return {
    title,
    unit,
    outcome,
    explanation,
    vocab,
    quiz,
    metadata: {
      ...input.metadataBase,
      sourceLanguage: input.sourceLanguage,
      translationComplete: input.translationComplete,
      translationError: input.translationError,
      warnings,
      needsReview,
    },
  };
}

export function validateMultilingualLesson(result: LessonGenerationMappedResult): string[] {
  const issues: string[] = [];
  for (const lang of LESSON_LANGS) {
    if (!result.explanation[lang]?.trim()) issues.push(`missing explanation.${lang}`);
    if (!result.title[lang]?.trim()) issues.push(`missing title.${lang}`);
    if (!result.outcome[lang]?.trim()) issues.push(`missing outcome.${lang}`);
  }
  const mcq = result.quiz.filter((q) => q.type === "multiple_choice");
  const tf = result.quiz.filter((q) => q.type === "true_false");
  const essay = result.quiz.filter((q) => q.type === "essay");
  if (mcq.length !== 4 || tf.length !== 4 || essay.length !== 2) {
    issues.push("quiz counts invalid");
  }
  if (result.vocab.length < 5 || result.vocab.length > 10) {
    issues.push("vocab count invalid");
  }
  return issues;
}
