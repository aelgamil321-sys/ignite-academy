import type { Bi, QuizQuestion, QuizQuestionType } from "@/lib/curriculum";

export const TRUE_FALSE_OPTIONS: Bi[] = [
  { en: "True", ar: "صح" },
  { en: "False", ar: "خطأ" },
];

export function emptyMultipleChoiceQuestion(): QuizQuestion {
  return {
    q: { en: "", ar: "" },
    type: "multiple_choice",
    options: [
      { en: "", ar: "" },
      { en: "", ar: "" },
      { en: "", ar: "" },
      { en: "", ar: "" },
    ],
    answer: 0,
    points: 1,
  };
}

export function emptyTrueFalseQuestion(): QuizQuestion {
  return {
    q: { en: "", ar: "" },
    type: "true_false",
    options: TRUE_FALSE_OPTIONS.map((o) => ({ ...o })),
    answer: 0,
    points: 1,
  };
}

export function normalizeQuizQuestion(raw: unknown): QuizQuestion {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const qRaw = o.q && typeof o.q === "object" ? (o.q as Record<string, unknown>) : {};
  const type: QuizQuestionType =
    o.type === "true_false" ? "true_false" : "multiple_choice";
  const optionsRaw = Array.isArray(o.options) ? o.options : [];
  const options: Bi[] =
    type === "true_false"
      ? TRUE_FALSE_OPTIONS.map((opt) => ({ ...opt }))
      : optionsRaw.length > 0
        ? optionsRaw.map((opt) => {
            const x = opt && typeof opt === "object" ? (opt as Record<string, unknown>) : {};
            return { en: String(x.en ?? ""), ar: String(x.ar ?? "") };
          })
        : emptyMultipleChoiceQuestion().options.map((x) => ({ ...x }));

  const answer = typeof o.answer === "number" ? o.answer : 0;
  const points = typeof o.points === "number" && o.points > 0 ? o.points : 1;

  return {
    q: { en: String(qRaw.en ?? ""), ar: String(qRaw.ar ?? "") },
    type,
    options,
    answer: Math.min(Math.max(0, answer), Math.max(options.length - 1, 0)),
    points,
  };
}

export function normalizeQuizList(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map(normalizeQuizQuestion);
}

export function quizQuestionsForForm(lessonQuiz: QuizQuestion[] | undefined): QuizQuestion[] {
  const normalized = normalizeQuizList(lessonQuiz ?? []);
  return normalized.length > 0 ? normalized : [emptyMultipleChoiceQuestion()];
}

/** Keep questions that have at least one language of question text. */
export function serializeQuizForSave(questions: QuizQuestion[]): QuizQuestion[] {
  return questions
    .map(normalizeQuizQuestion)
    .filter((q) => q.q.en.trim() || q.q.ar.trim())
    .map((q) => ({
      q: { en: q.q.en.trim(), ar: q.q.ar.trim() },
      type: q.type,
      options:
        q.type === "true_false"
          ? TRUE_FALSE_OPTIONS.map((o) => ({ ...o }))
          : q.options
              .filter((o) => o.en.trim() || o.ar.trim())
              .map((o) => ({ en: o.en.trim(), ar: o.ar.trim() })),
      answer: q.answer,
      points: q.points > 0 ? q.points : 1,
    }))
    .filter((q) => q.options.length >= 2);
}

export type QuizScoreResult = {
  score: number;
  totalPoints: number;
  percentage: number;
  correctCount: number;
  questionCount: number;
};

export function calculateQuizScore(
  questions: QuizQuestion[],
  answers: Record<number, number>,
): QuizScoreResult {
  let score = 0;
  let totalPoints = 0;
  let correctCount = 0;

  questions.forEach((q, i) => {
    const pts = q.points > 0 ? q.points : 1;
    totalPoints += pts;
    if (answers[i] === q.answer) {
      score += pts;
      correctCount += 1;
    }
  });

  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

  return {
    score,
    totalPoints,
    percentage,
    correctCount,
    questionCount: questions.length,
  };
}

export type QuizSubmissionAnswer = {
  questionIndex: number;
  selectedIndex: number;
  correctIndex: number;
  points: number;
  earned: number;
};

export function buildSubmissionAnswers(
  questions: QuizQuestion[],
  answers: Record<number, number>,
): QuizSubmissionAnswer[] {
  return questions.map((q, i) => {
    const pts = q.points > 0 ? q.points : 1;
    const selected = answers[i] ?? -1;
    const correct = selected === q.answer;
    return {
      questionIndex: i,
      selectedIndex: selected,
      correctIndex: q.answer,
      points: pts,
      earned: correct ? pts : 0,
    };
  });
}
