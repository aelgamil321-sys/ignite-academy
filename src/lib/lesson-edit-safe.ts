import type { Bi, QuizQuestion } from "@/lib/curriculum";
import type { CustomLesson } from "@/lib/cms";
import { parseLocalizedText } from "@/lib/lesson-localized";
import { normalizeQuizList } from "@/lib/lesson-quiz";
import { parseVocabFromStorage } from "@/lib/lesson-vocab";

/** Coerce any stored JSONB/localized value into a safe Bi for form state. */
export function biForLessonForm(raw: unknown): Bi {
  return parseLocalizedText(raw) as Bi;
}

/** Normalize lesson row data before LessonEditForm render (no DB writes). */
export function normalizeLessonForEditForm(lesson: CustomLesson): CustomLesson {
  return {
    ...lesson,
    unit: biForLessonForm(lesson.unit),
    title: biForLessonForm(lesson.title),
    outcome: biForLessonForm(lesson.outcome),
    explanation: biForLessonForm(lesson.explanation),
    vocab: parseVocabFromStorage(lesson.vocab),
    quiz: normalizeQuizList(lesson.quiz ?? []) as QuizQuestion[],
  };
}
