import type { Bi, QuizQuestion } from "@/lib/curriculum";
import type { CustomLesson } from "@/lib/cms";
import type { LessonAiOutput } from "@/lib/ai/lesson-generation-types";
import { detectLessonSourceLanguage } from "@/lib/ai/detect-source-language.server";
import { LESSON_LANGS, parseLocalizedText } from "@/lib/lesson-localized";
import { normalizeQuizList } from "@/lib/lesson-quiz";
import type { VocabularyItem } from "@/lib/lesson-vocab";

export type LessonAiReviewBundle = {
  title: Bi;
  unit: Bi;
  outcome: Bi;
  explanation: Bi;
  vocab: VocabularyItem[];
  quiz: QuizQuestion[];
};

const MIN_EXPLANATION_CHARS = 10;

function hasMeaningfulLocalizedText(text: Bi | undefined): boolean {
  const parsed = parseLocalizedText(text);
  return LESSON_LANGS.some((lang) => (parsed[lang]?.trim().length ?? 0) >= MIN_EXPLANATION_CHARS);
}

function hasPersistedQuizQuestions(questions: QuizQuestion[] | undefined): boolean {
  const normalized = normalizeQuizList(questions ?? []);
  return normalized.some((q) => {
    const parsed = parseLocalizedText(q.q);
    return LESSON_LANGS.some((lang) => Boolean(parsed[lang]?.trim()));
  });
}

function hasAnyVocabWord(item: VocabularyItem): boolean {
  const word = parseLocalizedText(item.word);
  return LESSON_LANGS.some((lang) => Boolean(word[lang]?.trim()));
}

/** True when the lesson row contains saved AI-style multilingual draft content. */
export function lessonHasSavedAiGeneratedContent(lesson: CustomLesson): boolean {
  const hasExplanation = hasMeaningfulLocalizedText(lesson.explanation);
  const hasVocab = lesson.vocab.some(hasAnyVocabWord);
  const hasQuiz = hasPersistedQuizQuestions(lesson.quiz);
  return hasExplanation && hasVocab && hasQuiz;
}

export function buildLessonAiReviewBundleFromLesson(lesson: CustomLesson): LessonAiReviewBundle {
  return {
    title: parseLocalizedText(lesson.title),
    unit: parseLocalizedText(lesson.unit),
    outcome: parseLocalizedText(lesson.outcome),
    explanation: parseLocalizedText(lesson.explanation),
    vocab: lesson.vocab.filter(hasAnyVocabWord),
    quiz: normalizeQuizList(lesson.quiz ?? []),
  };
}

export function countLessonLangPresence(text: Bi | undefined): Record<string, boolean> {
  const parsed = parseLocalizedText(text);
  return Object.fromEntries(LESSON_LANGS.map((lang) => [lang, Boolean(parsed[lang]?.trim())]));
}

function pickSourceLangText(bi: Bi | undefined, sourceLanguage: "en" | "ar"): string {
  const parsed = parseLocalizedText(bi);
  return parsed[sourceLanguage]?.trim() || parsed.en?.trim() || parsed.ar?.trim() || "";
}

/** Rebuild grounded source lesson JSON for translation-only retry (no file re-read). */
export function reconstructSourceLessonOutput(input: {
  bundle: LessonAiReviewBundle;
  lessonTitle: string;
  unitNumber: string;
  learningOutcome: string;
  sourceLanguageHint?: "en" | "ar";
}): LessonAiOutput | null {
  const summary = pickSourceLangText(input.bundle.explanation, "en") || pickSourceLangText(input.bundle.explanation, "ar");
  if (!summary) return null;

  const sourceLanguage = detectLessonSourceLanguage({
    lessonTitle: input.lessonTitle,
    learningOutcome: input.learningOutcome,
    unitNumber: input.unitNumber,
    extractedText: summary,
    hint: input.sourceLanguageHint,
  });

  const pick = (bi: Bi | undefined) => pickSourceLangText(bi, sourceLanguage);

  const vocabulary = input.bundle.vocab
    .map((item) => ({
      term: pick(item.word),
      synonym_or_simple_meaning: pick(item.meaning),
    }))
    .filter((item) => item.term.trim());

  const quiz = normalizeQuizList(input.bundle.quiz);
  const multiple_choice = quiz
    .filter((q) => q.type === "multiple_choice")
    .slice(0, 4)
    .map((q) => ({
      question: pick(q.q),
      options: q.options.map((opt) => pick(opt)),
      correctAnswer: q.answer,
      explanation: "",
    }));
  const true_false = quiz
    .filter((q) => q.type === "true_false")
    .slice(0, 4)
    .map((q) => ({
      statement: pick(q.q),
      correctAnswer: q.answer === 0,
      explanation: "",
    }));
  const essay = quiz
    .filter((q) => q.type === "essay")
    .slice(0, 2)
    .map((q) => {
      const guide = pick(q.modelAnswer) || "";
      return {
        question: pick(q.q),
        modelAnswer: guide,
        gradingGuide: guide,
      };
    });

  if (!multiple_choice.length && !true_false.length && !essay.length && !vocabulary.length) {
    return null;
  }

  return {
    lesson_summary: pick(input.bundle.explanation),
    vocabulary,
    quiz: { multiple_choice, true_false, essay },
    warnings: [],
  };
}
