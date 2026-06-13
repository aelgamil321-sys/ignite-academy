import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HelpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { QuizQuestion } from "@/lib/curriculum";
import {
  fetchLatestQuizSubmission,
  fetchStudentQuizSubmissions,
  isQuestionAnswered,
  normalizeQuizList,
  submitLessonQuiz,
  type SavedQuizSubmission,
} from "@/lib/lesson-quiz";
import { LessonQuizResults } from "@/components/lesson-quiz-results";

export function LessonQuizStudent({
  lessonId,
  questions: rawQuestions,
  gradeName,
  lessonTitle,
}: {
  lessonId: string;
  questions: QuizQuestion[];
  gradeName: { en: string; ar: string };
  lessonTitle: { en: string; ar: string };
}) {
  const { tr, lang } = useI18n();
  const questions = normalizeQuizList(rawQuestions);
  const [choiceAnswers, setChoiceAnswers] = useState<Record<number, number>>({});
  const [essayAnswers, setEssayAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSubmission, setSavedSubmission] = useState<SavedQuizSubmission | null>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const loadSeqRef = useRef(0);

  const loadFromSupabase = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoadingSubmission(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id ?? null;

      if (seq !== loadSeqRef.current) return;

      setUserId(uid);

      if (!uid) {
        setSavedSubmission(null);
        return;
      }

      const result = await fetchStudentQuizSubmissions(lessonId, uid);

      if (seq !== loadSeqRef.current) return;

      setSavedSubmission(result.latest);
      if (result.error) {
        console.error("[quiz load]", result.error);
      }
    } catch (error) {
      if (seq !== loadSeqRef.current) return;
      console.error("[quiz load]", error);
    } finally {
      if (seq === loadSeqRef.current) {
        setLoadingSubmission(false);
        setAuthReady(true);
      }
    }
  }, [lessonId]);

  useEffect(() => {
    setAuthReady(false);
    void loadFromSupabase();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED"
      ) {
        void loadFromSupabase();
      }
    });

    const onFocus = () => {
      void loadFromSupabase();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, [loadFromSupabase]);

  if (questions.length === 0) return null;

  const showResults = Boolean(savedSubmission);
  const showQuizForm = authReady && !loadingSubmission && !showResults;

  const allAnswered = questions.every((q, i) =>
    isQuestionAnswered(q, choiceAnswers, essayAnswers, i),
  );

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;

    setSaveError(null);
    setSubmitting(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (sessionError || !user) {
        setSaveError(
          lang === "ar"
            ? "سجّل الدخول لحفظ نتيجة الاختبار."
            : "Sign in to save your quiz result.",
        );
        return;
      }

      const existing = await fetchLatestQuizSubmission(lessonId, user.id);
      if (existing) {
        setSavedSubmission(existing);
        toast.info(
          lang === "ar" ? "تم إرسال هذا الاختبار مسبقاً" : "This quiz was already submitted",
        );
        return;
      }

      const { submission, error } = await submitLessonQuiz(
        lessonId,
        questions,
        choiceAnswers,
        essayAnswers,
      );

      if (error || !submission) {
        console.error("[quiz submit]", error);
        setSaveError(
          lang === "ar"
            ? `تعذر حفظ النتيجة: ${error ?? "unknown error"}`
            : `Could not save result: ${error ?? "unknown error"}`,
        );
        return;
      }

      setSavedSubmission(submission);
      toast.success(
        submission.status === "pending_review"
          ? lang === "ar"
            ? "تم إرسال الاختبار — الإجابة قيد مراجعة المعلم"
            : "Quiz submitted — answer pending teacher review"
          : lang === "ar"
            ? "تم حفظ نتيجة الاختبار"
            : "Quiz result saved",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = (type: QuizQuestion["type"]) => {
    if (type === "true_false") return lang === "ar" ? "صح / خطأ" : "True / False";
    if (type === "essay") return lang === "ar" ? "سؤال مقالي" : "Essay";
    return lang === "ar" ? "اختيار من متعدد" : "Multiple choice";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HelpCircle className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">{tr("ls_quiz")}</h2>
      </div>

      {!authReady || loadingSubmission ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          {lang === "ar" ? "جارٍ تحميل نتيجة الاختبار…" : "Loading quiz result…"}
        </div>
      ) : showResults ? (
        <LessonQuizResults
          submission={savedSubmission!}
          questions={questions}
          gradeName={gradeName}
          lessonTitle={lessonTitle}
        />
      ) : showQuizForm ? (
        <>
          <div className="space-y-6">
            {questions.map((q, i) => {
              const isEssay = q.type === "essay";
              const selected = choiceAnswers[i];

              return (
                <div key={i} className="rounded-xl border border-border bg-background p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-primary">
                      {tr("question")} {i + 1}
                    </span>
                    <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                      {typeLabel(q.type)}
                    </span>
                    <span className="text-[10px] rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-primary">
                      {q.points} {lang === "ar" ? "نقطة" : q.points === 1 ? "pt" : "pts"}
                    </span>
                  </div>
                  <div className="font-medium text-foreground mb-3">
                    {q.q[lang] || q.q.en || q.q.ar}
                  </div>

                  {isEssay ? (
                    <textarea
                      className="w-full min-h-[140px] rounded-lg border border-border bg-background px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                      dir={lang === "ar" ? "rtl" : "ltr"}
                      placeholder={
                        lang === "ar" ? "اكتب إجابتك هنا..." : "Write your answer here..."
                      }
                      value={essayAnswers[i] ?? ""}
                      onChange={(e) =>
                        setEssayAnswers((a) => ({ ...a, [i]: e.target.value }))
                      }
                    />
                  ) : (
                    <div className="grid gap-2">
                      {q.options.map((opt, oi) => {
                        const chosen = selected === oi;
                        return (
                          <button
                            key={oi}
                            type="button"
                            onClick={() => setChoiceAnswers((a) => ({ ...a, [i]: oi }))}
                            className={[
                              "text-start rounded-lg border px-4 py-2.5 text-sm transition-colors",
                              chosen
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border hover:border-primary hover:text-primary",
                            ].join(" ")}
                          >
                            {opt[lang] || opt.en || opt.ar}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 space-y-3">
            {!userId && (
              <p className="text-sm text-muted-foreground">
                {lang === "ar" ? "سجّل الدخول لحفظ نتيجتك." : "Sign in to save your result."}{" "}
                <Link to="/auth" search={{ mode: "login" }} className="underline text-primary">
                  {lang === "ar" ? "تسجيل الدخول" : "Sign in"}
                </Link>
              </p>
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
              onClick={() => void handleSubmit()}
              disabled={!allAnswered || submitting || !userId}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-[var(--shadow-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {tr("submit_quiz")}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
