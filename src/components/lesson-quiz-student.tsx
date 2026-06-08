import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HelpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { QuizQuestion } from "@/lib/curriculum";
import {
  buildSubmissionAnswers,
  calculateQuizScore,
  fetchLatestQuizSubmission,
  fetchStudentQuizSubmissions,
  isQuestionAnswered,
  normalizeQuizList,
  submissionRowToSaved,
  type SavedQuizSubmission,
} from "@/lib/lesson-quiz";
import { LessonQuizResults } from "@/components/lesson-quiz-results";

type QuizLoadDebug = {
  userId: string | null;
  lessonId: string;
  submissionsFound: number;
  latestSubmissionId: string | null;
  latestStatus: string | null;
  loadError: string | null;
};

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
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSubmission, setSavedSubmission] = useState<SavedQuizSubmission | null>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [debug, setDebug] = useState<QuizLoadDebug>({
    userId: null,
    lessonId,
    submissionsFound: 0,
    latestSubmissionId: null,
    latestStatus: null,
    loadError: null,
  });
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
        setDebug({
          userId: null,
          lessonId,
          submissionsFound: 0,
          latestSubmissionId: null,
          latestStatus: null,
          loadError: null,
        });
        return;
      }

      const result = await fetchStudentQuizSubmissions(lessonId, uid);

      if (seq !== loadSeqRef.current) return;

      setSavedSubmission(result.latest);
      setDebug({
        userId: uid,
        lessonId,
        submissionsFound: result.count,
        latestSubmissionId: result.latest?.id ?? null,
        latestStatus: result.latest?.status ?? null,
        loadError: result.error,
      });
    } catch (error) {
      if (seq !== loadSeqRef.current) return;
      const message = error instanceof Error ? error.message : String(error);
      console.error("[quiz load]", error);
      setDebug((prev) => ({ ...prev, loadError: message }));
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
        setDebug((prev) => ({
          ...prev,
          userId: user.id,
          submissionsFound: Math.max(prev.submissionsFound, 1),
          latestSubmissionId: existing.id,
          latestStatus: existing.status,
        }));
        toast.info(
          lang === "ar" ? "تم إرسال هذا الاختبار مسبقاً" : "This quiz was already submitted",
        );
        return;
      }

      const scoreResult = calculateQuizScore(questions, choiceAnswers, essayAnswers);
      const submissionAnswers = buildSubmissionAnswers(questions, choiceAnswers, essayAnswers);
      const { data: inserted, error } = await supabase
        .from("lesson_quiz_submissions")
        .insert({
          student_id: user.id,
          lesson_id: lessonId,
          score: scoreResult.autoScore,
          auto_score: scoreResult.autoScore,
          essay_score: 0,
          final_score: scoreResult.autoScore,
          total_points: scoreResult.totalPoints,
          percentage: scoreResult.finalPercentage,
          status: scoreResult.status,
          answers: submissionAnswers,
        })
        .select("*")
        .single();

      if (error) {
        console.error("[quiz submit]", error);
        setSaveError(
          lang === "ar"
            ? `تعذر حفظ النتيجة: ${error.message}`
            : `Could not save result: ${error.message}`,
        );
        return;
      }

      const submission = submissionRowToSaved(inserted as Record<string, unknown>);
      setSavedSubmission(submission);
      setDebug({
        userId: user.id,
        lessonId,
        submissionsFound: 1,
        latestSubmissionId: submission.id,
        latestStatus: submission.status,
        loadError: null,
      });
      toast.success(
        scoreResult.hasEssayPending
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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
          <HelpCircle className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl font-semibold text-primary">{tr("ls_quiz")}</h2>
      </div>

      <div className="mb-4 rounded-lg border border-dashed border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs font-mono space-y-1">
        <div className="font-sans text-[11px] font-semibold text-amber-800 dark:text-amber-300 mb-1">
          Quiz load debug (temporary)
        </div>
        <div>
          <span className="text-muted-foreground">user id:</span>{" "}
          <span className="break-all">{debug.userId ?? "— (not signed in)"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">lesson id:</span>{" "}
          <span className="break-all">{debug.lessonId}</span>
        </div>
        <div>
          <span className="text-muted-foreground">submissions found:</span> {debug.submissionsFound}
        </div>
        <div>
          <span className="text-muted-foreground">latest submission id:</span>{" "}
          <span className="break-all">{debug.latestSubmissionId ?? "—"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">latest status:</span>{" "}
          {debug.latestStatus ?? "—"}
        </div>
        {debug.loadError && (
          <div className="text-destructive">
            <span className="text-muted-foreground">error:</span> {debug.loadError}
          </div>
        )}
      </div>

      {!authReady || loadingSubmission ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          {lang === "ar" ? "جارٍ تحميل نتيجة الاختبار…" : "Loading quiz result…"}
        </div>
      ) : showResults ? (
        <LessonQuizResults submission={savedSubmission!} questions={questions} />
      ) : showQuizForm ? (
        <>
          <div className="space-y-6">
            {questions.map((q, i) => {
              const isEssay = q.type === "essay";
              const selected = choiceAnswers[i];

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
                  <div className="font-medium text-foreground mb-3">
                    {q.q[lang] || q.q.en || q.q.ar}
                  </div>

                  {isEssay ? (
                    <textarea
                      className="w-full min-h-[140px] rounded-lg border border-border bg-background px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-emerald/30"
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
                                : "border-border hover:border-emerald hover:text-emerald",
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
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors shadow-[var(--shadow-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
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
