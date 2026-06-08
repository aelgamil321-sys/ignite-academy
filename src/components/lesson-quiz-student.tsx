import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { HelpCircle, CheckCircle2, XCircle, RotateCcw, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { QuizQuestion } from "@/lib/curriculum";
import {
  buildSubmissionAnswers,
  calculateQuizScore,
  isQuestionAnswered,
  normalizeQuizList,
} from "@/lib/lesson-quiz";

export function LessonQuizStudent({
  lessonId,
  questions: rawQuestions,
}: {
  lessonId: string;
  questions: QuizQuestion[];
}) {
  const { tr, lang } = useI18n();
  const questions = normalizeQuizList(rawQuestions);
  const [choiceAnswers, setChoiceAnswers] = useState<Record<number, number>>({});
  const [essayAnswers, setEssayAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof calculateQuizScore> | null>(null);

  if (questions.length === 0) return null;

  const allAnswered = questions.every((q, i) =>
    isQuestionAnswered(q, choiceAnswers, essayAnswers, i),
  );

  const handleSubmit = async () => {
    if (!allAnswered) return;

    const scoreResult = calculateQuizScore(questions, choiceAnswers, essayAnswers);
    setResult(scoreResult);
    setSubmitted(true);
    setSaveError(null);
    setSaved(false);
    setSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setSaveError(
          lang === "ar"
            ? "سجّل الدخول لحفظ نتيجة الاختبار. تم عرض نتيجتك محلياً."
            : "Sign in to save your quiz result. Your score is shown locally.",
        );
        return;
      }

      const submissionAnswers = buildSubmissionAnswers(questions, choiceAnswers, essayAnswers);
      const { error } = await supabase.from("lesson_quiz_submissions").insert({
        student_id: authData.user.id,
        lesson_id: lessonId,
        score: scoreResult.autoScore,
        auto_score: scoreResult.autoScore,
        essay_score: 0,
        final_score: scoreResult.autoScore,
        total_points: scoreResult.totalPoints,
        percentage: scoreResult.finalPercentage,
        status: scoreResult.status,
        answers: submissionAnswers,
      });

      if (error) {
        console.error("[quiz submit]", error);
        setSaveError(
          lang === "ar"
            ? `تعذر حفظ النتيجة: ${error.message}`
            : `Could not save result: ${error.message}`,
        );
        return;
      }

      setSaved(true);
      toast.success(
        scoreResult.hasEssayPending
          ? lang === "ar"
            ? "تم إرسال الاختبار — الإجابات المقالية قيد المراجعة"
            : "Quiz submitted — essay answers pending teacher review"
          : lang === "ar"
            ? "تم حفظ نتيجة الاختبار"
            : "Quiz result saved",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setChoiceAnswers({});
    setEssayAnswers({});
    setSubmitted(false);
    setResult(null);
    setSaveError(null);
    setSaved(false);
  };

  const typeLabel = (type: QuizQuestion["type"]) => {
    if (type === "true_false") return lang === "ar" ? "صح / خطأ" : "True / False";
    if (type === "essay") return lang === "ar" ? "سؤال مقالي" : "Essay";
    return lang === "ar" ? "اختيار من متعدد" : "Multiple choice";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
          <HelpCircle className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl font-semibold text-primary">{tr("ls_quiz")}</h2>
      </div>

      <div className="space-y-6">
        {questions.map((q, i) => {
          const isEssay = q.type === "essay";
          const selected = choiceAnswers[i];
          const isCorrect = submitted && !isEssay && selected === q.answer;

          return (
            <div key={i} className="rounded-xl border border-border bg-background p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-[0.18em] text-emerald">
                  {tr("question")} {i + 1}
                </span>
                <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                  {typeLabel(q.type)}
                </span>
                <span className="text-[10px] rounded-full border border-emerald/30 bg-emerald/5 px-2 py-0.5 text-emerald">
                  {q.points} {lang === "ar" ? "نقطة" : q.points === 1 ? "pt" : "pts"}
                </span>
              </div>
              <div className="font-medium text-foreground mb-3">{q.q[lang] || q.q.en || q.q.ar}</div>

              {isEssay ? (
                <textarea
                  className="w-full min-h-[140px] rounded-lg border border-border bg-background px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-emerald/30"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  placeholder={
                    lang === "ar" ? "اكتب إجابتك هنا..." : "Write your answer here..."
                  }
                  value={essayAnswers[i] ?? ""}
                  disabled={submitted}
                  onChange={(e) =>
                    setEssayAnswers((a) => ({ ...a, [i]: e.target.value }))
                  }
                />
              ) : (
                <div className="grid gap-2">
                  {q.options.map((opt, oi) => {
                    const chosen = selected === oi;
                    const correctChoice = submitted && oi === q.answer;
                    const wrongChoice = submitted && chosen && oi !== q.answer;
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={submitted}
                        onClick={() => setChoiceAnswers((a) => ({ ...a, [i]: oi }))}
                        className={[
                          "text-start rounded-lg border px-4 py-2.5 text-sm transition-colors",
                          correctChoice
                            ? "border-emerald bg-emerald/10 text-emerald"
                            : wrongChoice
                              ? "border-destructive bg-destructive/10 text-destructive"
                              : chosen
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-emerald hover:text-emerald",
                        ].join(" ")}
                      >
                        {opt[lang] || opt.en || opt.ar}
                      </button>
                    );
                  })}
                </div>
              )}

              {submitted && !isEssay && (
                <div
                  className={`mt-3 inline-flex items-center gap-2 text-sm font-medium ${isCorrect ? "text-emerald" : "text-destructive"}`}
                >
                  {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {isCorrect ? tr("correct") : tr("incorrect")}
                </div>
              )}

              {submitted && isEssay && (
                <div className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-amber-600">
                  <Clock className="h-4 w-4" />
                  {lang === "ar" ? "قيد مراجعة المعلّم" : "Pending teacher review"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        {!submitted ? (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!allAnswered || submitting}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors shadow-[var(--shadow-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {tr("submit_quiz")}
          </button>
        ) : (
          result && (
            <div className="rounded-xl border border-emerald/30 bg-emerald/5 p-4 space-y-2">
              <div className="font-display text-lg text-primary">
                {lang === "ar" ? "الدرجة التلقائية" : "Auto-graded score"}:{" "}
                <span className="text-emerald">
                  {result.autoScore}/{result.autoTotalPoints}
                </span>
                {result.autoTotalPoints > 0 && (
                  <span className="text-muted-foreground text-base ms-2">
                    ({result.percentage}%)
                  </span>
                )}
              </div>

              {result.hasEssayPending && (
                <div className="text-sm text-amber-700 font-medium inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  {lang === "ar"
                    ? `${result.essayPendingPoints} نقطة مقالية قيد المراجعة`
                    : `${result.essayPendingPoints} essay pts pending review`}
                </div>
              )}

              {!result.hasEssayPending && (
                <div className="text-sm text-muted-foreground">
                  {lang === "ar"
                    ? `${result.correctCount} من ${result.autoQuestionCount} إجابات صحيحة`
                    : `${result.correctCount} of ${result.autoQuestionCount} auto-graded questions correct`}
                </div>
              )}

              {saved && (
                <div className="text-sm text-emerald font-medium">
                  {result.hasEssayPending
                    ? lang === "ar"
                      ? "تم إرسال الاختبار بنجاح"
                      : "Quiz submitted successfully"
                    : lang === "ar"
                      ? "تم حفظ النتيجة بنجاح"
                      : "Result saved successfully"}
                </div>
              )}
              {saveError && (
                <div className="text-sm text-destructive">
                  {saveError}{" "}
                  <Link to="/auth" search={{ mode: "login" }} className="underline text-primary">
                    {lang === "ar" ? "تسجيل الدخول" : "Sign in"}
                  </Link>
                </div>
              )}
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold hover:border-emerald hover:text-emerald transition-colors mt-2"
              >
                <RotateCcw className="h-4 w-4" /> {tr("retry_quiz")}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
