import type { Bi, QuizQuestion, QuizQuestionType } from "@/lib/curriculum";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "./i18n-config";
import { contentLocale, L } from "./i18n-config";
import { LESSON_LANGS, parseLocalizedText, serializeLocalizedText } from "./lesson-localized";

export const TRUE_FALSE_OPTIONS: Bi[] = [
  { en: "True", ar: "صح" },
  { en: "False", ar: "خطأ" },
];

export type QuizSubmissionStatus = "pending_review" | "reviewed";

export type QuizSubmissionAnswerItem =
  | {
      questionIndex: number;
      type: "multiple_choice" | "true_false";
      selectedIndex: number;
      correctIndex: number;
      points: number;
      earned: number;
      status: "auto_graded";
    }
  | {
      questionIndex: number;
      type: "essay";
      essayText: string;
      points: number;
      earned: number;
      status: "pending_review" | "reviewed";
      teacherFeedback?: Bi;
    };

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

export function emptyEssayQuestion(): QuizQuestion {
  return {
    q: { en: "", ar: "" },
    type: "essay",
    options: [],
    answer: 0,
    points: 5,
    modelAnswer: { en: "", ar: "" },
  };
}

function parseBi(raw: unknown): Bi {
  return parseLocalizedText(raw);
}

export function normalizeQuizQuestion(raw: unknown): QuizQuestion {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const qRaw = o.q && typeof o.q === "object" ? (o.q as Record<string, unknown>) : {};
  const type: QuizQuestionType =
    o.type === "true_false" ? "true_false" : o.type === "essay" ? "essay" : "multiple_choice";

  if (type === "essay") {
    const modelRaw = o.modelAnswer ?? o.model_answer;
    const modelAnswer =
      modelRaw && typeof modelRaw === "object"
        ? parseBi(modelRaw)
        : { en: "", ar: "" };
    const hasModel = modelAnswer.en.trim() || modelAnswer.ar.trim();
    return {
      q: parseBi(qRaw),
      type: "essay",
      options: [],
      answer: 0,
      points: typeof o.points === "number" && o.points > 0 ? o.points : 1,
      modelAnswer: hasModel ? modelAnswer : undefined,
    };
  }

  const optionsRaw = Array.isArray(o.options) ? o.options : [];
  const options: Bi[] =
    type === "true_false"
      ? TRUE_FALSE_OPTIONS.map((opt) => ({ ...opt }))
      : optionsRaw.length > 0
        ? optionsRaw.map((opt) => parseBi(opt))
        : emptyMultipleChoiceQuestion().options.map((x) => ({ ...x }));

  const answer = typeof o.answer === "number" ? o.answer : 0;
  const points = typeof o.points === "number" && o.points > 0 ? o.points : 1;

  return {
    q: parseBi(qRaw),
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

function hasAnyLocalizedText(text: Bi): boolean {
  const parsed = parseLocalizedText(text);
  return LESSON_LANGS.some((lang) => Boolean(parsed[lang]?.trim()));
}

function serializeBiForSave(text: Bi): Bi {
  return serializeLocalizedText(parseLocalizedText(text));
}

/** Keep questions that have at least one language of question text. */
export function serializeQuizForSave(questions: QuizQuestion[]): QuizQuestion[] {
  return questions
    .map(normalizeQuizQuestion)
    .filter((q) => hasAnyLocalizedText(q.q))
    .map((q) => {
      const qSerialized = serializeBiForSave(q.q);
      if (q.type === "essay") {
        const model = q.modelAnswer;
        const hasModel = model && hasAnyLocalizedText(model);
        return {
          q: qSerialized,
          type: "essay" as const,
          options: [],
          answer: 0,
          points: q.points > 0 ? q.points : 1,
          ...(hasModel ? { modelAnswer: serializeBiForSave(model) } : {}),
        };
      }
      return {
        q: qSerialized,
        type: q.type,
        options:
          q.type === "true_false"
            ? TRUE_FALSE_OPTIONS.map((o) => serializeBiForSave(o))
            : q.options.filter(hasAnyLocalizedText).map(serializeBiForSave),
        answer: q.answer,
        points: q.points > 0 ? q.points : 1,
      };
    })
    .filter((q) => q.type === "essay" || q.options.length >= 2);
}

export type QuizScoreResult = {
  autoScore: number;
  autoTotalPoints: number;
  essayPendingPoints: number;
  totalPoints: number;
  percentage: number;
  finalPercentage: number;
  correctCount: number;
  autoQuestionCount: number;
  essayQuestionCount: number;
  questionCount: number;
  hasEssayPending: boolean;
  status: QuizSubmissionStatus;
  /** @deprecated use autoScore — kept for backward compatibility */
  score: number;
};

export function calculateQuizScore(
  questions: QuizQuestion[],
  choiceAnswers: Record<number, number>,
  essayAnswers: Record<number, string> = {},
): QuizScoreResult {
  let autoScore = 0;
  let autoTotalPoints = 0;
  let essayPendingPoints = 0;
  let totalPoints = 0;
  let correctCount = 0;
  let autoQuestionCount = 0;
  let essayQuestionCount = 0;

  questions.forEach((q, i) => {
    const pts = q.points > 0 ? q.points : 1;
    totalPoints += pts;

    if (q.type === "essay") {
      essayQuestionCount += 1;
      if (essayAnswers[i]?.trim()) {
        essayPendingPoints += pts;
      } else {
        essayPendingPoints += pts;
      }
      return;
    }

    autoQuestionCount += 1;
    autoTotalPoints += pts;
    if (choiceAnswers[i] === q.answer) {
      autoScore += pts;
      correctCount += 1;
    }
  });

  const hasEssayPending = essayQuestionCount > 0;
  const percentage = autoTotalPoints > 0 ? Math.round((autoScore / autoTotalPoints) * 100) : 0;
  const finalPercentage = totalPoints > 0 ? Math.round((autoScore / totalPoints) * 100) : 0;

  return {
    autoScore,
    autoTotalPoints,
    essayPendingPoints,
    totalPoints,
    percentage,
    finalPercentage,
    correctCount,
    autoQuestionCount,
    essayQuestionCount,
    questionCount: questions.length,
    hasEssayPending,
    status: hasEssayPending ? "pending_review" : "reviewed",
    score: autoScore,
  };
}

export function buildSubmissionAnswers(
  questions: QuizQuestion[],
  choiceAnswers: Record<number, number>,
  essayAnswers: Record<number, string>,
): QuizSubmissionAnswerItem[] {
  return questions.map((q, i) => {
    const pts = q.points > 0 ? q.points : 1;
    if (q.type === "essay") {
      return {
        questionIndex: i,
        type: "essay" as const,
        essayText: essayAnswers[i]?.trim() ?? "",
        points: pts,
        earned: 0,
        status: "pending_review" as const,
      };
    }
    const selected = choiceAnswers[i] ?? -1;
    const correct = selected === q.answer;
    return {
      questionIndex: i,
      type: q.type,
      selectedIndex: selected,
      correctIndex: q.answer,
      points: pts,
      earned: correct ? pts : 0,
      status: "auto_graded" as const,
    };
  });
}

export function isQuestionAnswered(
  q: QuizQuestion,
  choiceAnswers: Record<number, number>,
  essayAnswers: Record<number, string>,
  index: number,
): boolean {
  if (q.type === "essay") {
    return Boolean(essayAnswers[index]?.trim());
  }
  return choiceAnswers[index] !== undefined;
}

export function recalculateSubmissionScores(
  answers: QuizSubmissionAnswerItem[],
  autoScoreFromRow?: number,
): {
  autoScore: number;
  essayScore: number;
  finalScore: number;
  totalPoints: number;
  percentage: number;
  status: QuizSubmissionStatus;
} {
  let autoScore = 0;
  let essayScore = 0;
  let totalPoints = 0;

  for (const a of answers) {
    totalPoints += a.points;
    if (a.type === "essay") {
      essayScore += a.earned;
    } else {
      autoScore += a.earned;
    }
  }

  if (autoScoreFromRow != null && essayScore === 0) {
    autoScore = autoScoreFromRow;
  }

  const finalScore = autoScore + essayScore;
  const percentage = totalPoints > 0 ? Math.round((finalScore / totalPoints) * 100) : 0;
  const hasPendingEssay = answers.some((a) => a.type === "essay" && a.status === "pending_review");

  return {
    autoScore,
    essayScore,
    finalScore,
    totalPoints,
    percentage,
    status: hasPendingEssay ? "pending_review" : "reviewed",
  };
}

export function parseSubmissionAnswers(raw: unknown): QuizSubmissionAnswerItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const type = o.type === "essay" ? "essay" : o.type === "true_false" ? "true_false" : "multiple_choice";
    const points = typeof o.points === "number" ? o.points : 1;
    const earned = typeof o.earned === "number" ? o.earned : 0;
    const questionIndex = typeof o.questionIndex === "number" ? o.questionIndex : 0;

    if (type === "essay") {
      const fbRaw = o.teacherFeedback ?? o.teacher_feedback;
      const teacherFeedback =
        fbRaw && typeof fbRaw === "object" ? parseBi(fbRaw) : undefined;
      const hasFeedback =
        teacherFeedback && (teacherFeedback.en.trim() || teacherFeedback.ar.trim());
      return {
        questionIndex,
        type: "essay" as const,
        essayText: String(o.essayText ?? o.essay_text ?? ""),
        points,
        earned,
        status: o.status === "reviewed" ? "reviewed" : "pending_review",
        ...(hasFeedback ? { teacherFeedback } : {}),
      };
    }

    return {
      questionIndex,
      type,
      selectedIndex: typeof o.selectedIndex === "number" ? o.selectedIndex : -1,
      correctIndex: typeof o.correctIndex === "number" ? o.correctIndex : 0,
      points,
      earned,
      status: "auto_graded" as const,
    };
  });
}

export type SavedQuizSubmission = {
  id: string;
  lesson_id: string;
  student_id: string;
  auto_score: number;
  essay_score: number;
  final_score: number;
  total_points: number;
  percentage: number;
  status: QuizSubmissionStatus;
  answers: QuizSubmissionAnswerItem[];
  submitted_at: string;
};

export function gradeLabelForPercentage(percentage: number, lang: Lang): string {
  if (percentage >= 90) return L("Excellent", "ممتاز")[lang];
  if (percentage >= 80) return L("Very Good", "جيد جدًا")[lang];
  if (percentage >= 70) return L("Good", "جيد")[lang];
  if (percentage >= 60) return L("Pass", "مقبول")[lang];
  return L("Needs Improvement", "يحتاج إلى تحسين")[lang];
}

export function optionLabel(
  options: Bi[],
  index: number,
  lang: Lang | "en" | "ar",
): string {
  const opt = options[index];
  if (!opt) return "—";
  const locale = contentLocale(lang as Lang);
  return opt[locale] || opt.en || opt.ar || "—";
}

export function submissionRowToSaved(row: Record<string, unknown>): SavedQuizSubmission {
  return {
    id: String(row.id),
    lesson_id: String(row.lesson_id),
    student_id: String(row.student_id),
    auto_score: Number(row.auto_score ?? row.score ?? 0),
    essay_score: Number(row.essay_score ?? 0),
    final_score: Number(row.final_score ?? row.score ?? 0),
    total_points: Number(row.total_points ?? 0),
    percentage: Number(row.percentage ?? 0),
    status: (row.status === "pending_review" ? "pending_review" : "reviewed") as QuizSubmissionStatus,
    answers: parseSubmissionAnswers(row.answers),
    submitted_at: String(row.submitted_at ?? ""),
  };
}

/** Raw answer payload sent to submit_lesson_quiz RPC (no scores). */
export type QuizSubmitAnswerPayload =
  | {
      questionIndex: number;
      type: "multiple_choice" | "true_false";
      selectedIndex: number;
    }
  | {
      questionIndex: number;
      type: "essay";
      essayText: string;
    };

export function buildQuizSubmitPayload(
  questions: QuizQuestion[],
  choiceAnswers: Record<number, number>,
  essayAnswers: Record<number, string>,
): QuizSubmitAnswerPayload[] {
  return questions.map((q, i) => {
    if (q.type === "essay") {
      return {
        questionIndex: i,
        type: "essay" as const,
        essayText: essayAnswers[i]?.trim() ?? "",
      };
    }
    return {
      questionIndex: i,
      type: q.type,
      selectedIndex: choiceAnswers[i] ?? -1,
    };
  });
}

/**
 * Submit a lesson quiz via server-side grading (submit_lesson_quiz RPC).
 * Clients must not insert score fields directly into lesson_quiz_submissions.
 */
export async function submitLessonQuiz(
  lessonId: string,
  questions: QuizQuestion[],
  choiceAnswers: Record<number, number>,
  essayAnswers: Record<number, string>,
): Promise<{ submission: SavedQuizSubmission | null; error: string | null }> {
  const payload = buildQuizSubmitPayload(questions, choiceAnswers, essayAnswers);

  const { data, error } = await supabase.rpc("submit_lesson_quiz", {
    p_lesson_id: lessonId,
    p_answers: payload,
  });

  if (error) {
    console.error("[submitLessonQuiz]", error);
    return { submission: null, error: error.message };
  }

  if (!data) {
    return { submission: null, error: "Quiz submission returned no data" };
  }

  return {
    submission: submissionRowToSaved(data as Record<string, unknown>),
    error: null,
  };
}

/** Load the latest saved quiz submission for a student + lesson from Supabase. */
export async function fetchLatestQuizSubmission(
  lessonId: string,
  studentId: string,
): Promise<SavedQuizSubmission | null> {
  const result = await fetchStudentQuizSubmissions(lessonId, studentId);
  return result.latest;
}

export type StudentQuizSubmissionLoad = {
  latest: SavedQuizSubmission | null;
  count: number;
  error: string | null;
};

/**
 * Fetch submissions for the current student + lesson.
 * Always call after supabase.auth.getSession() so RLS sees auth.uid().
 */
export async function fetchStudentQuizSubmissions(
  lessonId: string,
  studentId: string,
): Promise<StudentQuizSubmissionLoad> {
  const { data, error, count } = await supabase
    .from("lesson_quiz_submissions")
    .select("*", { count: "exact" })
    .eq("lesson_id", lessonId)
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[fetchStudentQuizSubmissions]", error);
    return { latest: null, count: 0, error: error.message };
  }

  const rows = data ?? [];
  return {
    latest: rows[0]
      ? submissionRowToSaved(rows[0] as Record<string, unknown>)
      : null,
    count: count ?? rows.length,
    error: null,
  };
}
