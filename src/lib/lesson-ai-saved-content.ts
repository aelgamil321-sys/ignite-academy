import type { Bi, QuizQuestion } from "@/lib/curriculum";
import type { CustomLesson } from "@/lib/cms";
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
