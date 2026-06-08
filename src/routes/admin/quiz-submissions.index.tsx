import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCMS } from "@/lib/cms";
import { useI18n } from "@/lib/i18n";
import {
  normalizeQuizList,
  parseSubmissionAnswers,
  recalculateSubmissionScores,
  type QuizSubmissionAnswerItem,
  type QuizSubmissionStatus,
} from "@/lib/lesson-quiz";
import type { QuizQuestion, Bi } from "@/lib/curriculum";

const L = (en: string, ar: string) => ({ en, ar });

type SubmissionRow = {
  id: string;
  student_id: string;
  lesson_id: string;
  score: number;
  auto_score: number;
  essay_score: number;
  final_score: number;
  total_points: number;
  percentage: number;
  status: QuizSubmissionStatus;
  answers: unknown;
  submitted_at: string;
};

type ProfileRow = { user_id: string; email: string | null; full_name: string | null };

export const Route = createFileRoute("/admin/quiz-submissions/")({
  head: () => ({
    meta: [
      { title: "Quiz Submissions — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminQuizSubmissionsPage,
});

function AdminQuizSubmissionsPage() {
  const { lang } = useI18n();
  const { lessons } = useCMS();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftScores, setDraftScores] = useState<Record<string, Record<number, number>>>({});
  const [draftFeedback, setDraftFeedback] = useState<Record<string, Record<number, Bi>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const lessonMap = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const lessonQuizMap = useMemo(() => {
    const m = new Map<string, QuizQuestion[]>();
    for (const l of lessons) {
      m.set(l.id, normalizeQuizList(l.quiz ?? []));
    }
    return m;
  }, [lessons]);

  const load = useCallback(async () => {
    setLoading(true);
    const [subRes, profRes] = await Promise.all([
      supabase
        .from("lesson_quiz_submissions")
        .select("*")
        .order("submitted_at", { ascending: false }),
      supabase.from("profiles").select("user_id, email, full_name"),
    ]);

    if (subRes.error) {
      console.error("[quiz-submissions]", subRes.error);
      toast.error(subRes.error.message);
    } else {
      setRows((subRes.data ?? []) as SubmissionRow[]);
    }

    if (!profRes.error && profRes.data) {
      setProfiles(new Map(profRes.data.map((p) => [p.user_id, p as ProfileRow])));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = rows.filter((r) => r.status === "pending_review").length;

  const getDraft = (submissionId: string, questionIndex: number, fallback: number) =>
    draftScores[submissionId]?.[questionIndex] ?? fallback;

  const setDraft = (submissionId: string, questionIndex: number, value: number) => {
    setDraftScores((prev) => ({
      ...prev,
      [submissionId]: { ...prev[submissionId], [questionIndex]: value },
    }));
  };

  const getFeedbackDraft = (
    submissionId: string,
    questionIndex: number,
    fallback?: Bi,
  ): Bi => draftFeedback[submissionId]?.[questionIndex] ?? fallback ?? { en: "", ar: "" };

  const setFeedbackDraft = (
    submissionId: string,
    questionIndex: number,
    patch: Partial<Bi>,
  ) => {
    setDraftFeedback((prev) => {
      const current = prev[submissionId]?.[questionIndex] ?? { en: "", ar: "" };
      return {
        ...prev,
        [submissionId]: {
          ...prev[submissionId],
          [questionIndex]: { ...current, ...patch },
        },
      };
    });
  };

  const handleSaveReview = async (row: SubmissionRow) => {
    setSavingId(row.id);
    try {
      const answers = parseSubmissionAnswers(row.answers);
      const draft = draftScores[row.id] ?? {};
      const updatedAnswers: QuizSubmissionAnswerItem[] = answers.map((a) => {
        if (a.type !== "essay") return a;
        const earned = Math.min(
          a.points,
          Math.max(0, draft[a.questionIndex] ?? a.earned),
        );
        const fb = getFeedbackDraft(row.id, a.questionIndex, a.teacherFeedback);
        const hasFeedback = fb.en.trim() || fb.ar.trim();
        return {
          ...a,
          earned,
          status: "reviewed" as const,
          ...(hasFeedback
            ? { teacherFeedback: { en: fb.en.trim(), ar: fb.ar.trim() } }
            : {}),
        };
      });

      const autoScore =
        typeof row.auto_score === "number" && row.auto_score > 0
          ? row.auto_score
          : updatedAnswers
              .filter((a) => a.type !== "essay")
              .reduce((sum, a) => sum + a.earned, 0);

      const totals = recalculateSubmissionScores(updatedAnswers, autoScore);

      const { error } = await supabase
        .from("lesson_quiz_submissions")
        .update({
          answers: updatedAnswers,
          auto_score: totals.autoScore,
          essay_score: totals.essayScore,
          final_score: totals.finalScore,
          score: totals.finalScore,
          percentage: totals.percentage,
          status: totals.status,
        })
        .eq("id", row.id);

      if (error) throw error;

      toast.success(L("Submission reviewed", "تمت مراجعة الإرسال")[lang]);
      setDraftScores((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setDraftFeedback((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      await load();
    } catch (e) {
      console.error("[review save]", e);
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-primary">
          {L("Quiz Submissions", "إرسالات الاختبارات")[lang]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {L(
            "Review student quiz submissions and grade essay answers.",
            "راجع إرسالات الطلاب وقيّم الإجابات المقالية.",
          )[lang]}
        </p>
        {pendingCount > 0 && (
          <p className="text-sm text-amber-700 mt-2 font-medium">
            {pendingCount}{" "}
            {L("submission(s) pending review", "إرسال(ات) بانتظار المراجعة")[lang]}
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{L("Loading…", "جارٍ التحميل…")[lang]}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {L("No quiz submissions yet.", "لا توجد إرسالات بعد.")[lang]}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const lesson = lessonMap.get(row.lesson_id);
            const profile = profiles.get(row.student_id);
            const expanded = expandedId === row.id;
            const answers = parseSubmissionAnswers(row.answers);
            const essayItems = answers.filter((a) => a.type === "essay");
            const autoScore =
              row.auto_score ?? answers.filter((a) => a.type !== "essay").reduce((s, a) => s + a.earned, 0);
            const essayScore =
              row.essay_score ?? essayItems.reduce((s, a) => s + a.earned, 0);
            const finalScore = row.final_score ?? autoScore + essayScore;
            const quizQuestions = lessonQuizMap.get(row.lesson_id) ?? [];

            return (
              <li key={row.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : row.id)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 p-4 text-start hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="font-medium text-foreground">
                      {lesson?.title[lang] || lesson?.title.en || row.lesson_id}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {profile?.full_name || profile?.email || row.student_id}
                      {" · "}
                      {new Date(row.submitted_at).toLocaleString(lang === "ar" ? "ar" : "en")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs rounded-full px-2.5 py-1 font-semibold ${
                        row.status === "pending_review"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald/10 text-emerald"
                      }`}
                    >
                      {row.status === "pending_review"
                        ? L("Pending review", "قيد المراجعة")[lang]
                        : L("Reviewed", "تمت المراجعة")[lang]}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {finalScore}/{row.total_points}
                    </span>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-border p-4 space-y-4 bg-background/50">
                    <div className="grid gap-2 sm:grid-cols-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">{L("Auto score", "الدرجة التلقائية")[lang]}: </span>
                        <span className="font-semibold">{autoScore}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{L("Essay score", "درجة المقالي")[lang]}: </span>
                        <span className="font-semibold">{essayScore}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{L("Final score", "الدرجة النهائية")[lang]}: </span>
                        <span className="font-semibold text-emerald">
                          {finalScore}/{row.total_points} ({row.percentage}%)
                        </span>
                      </div>
                    </div>

                    {answers.map((a) => {
                      if (a.type === "essay") {
                        const q = quizQuestions[a.questionIndex];
                        const model = q?.modelAnswer;
                        return (
                          <div
                            key={`essay-${a.questionIndex}`}
                            className="rounded-lg border border-border p-4 space-y-3"
                          >
                            <div className="text-xs uppercase tracking-wider text-emerald font-semibold">
                              {L("Essay", "سؤال مقالي")[lang]} #{a.questionIndex + 1}
                              <span className="text-muted-foreground font-normal ms-2">
                                ({a.points} {L("pts max", "نقطة كحد أقصى")[lang]})
                              </span>
                            </div>
                            {q && (
                              <div className="text-sm font-medium">
                                {q.q[lang] || q.q.en || q.q.ar}
                              </div>
                            )}
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                {L("Student answer", "إجابة الطالب")[lang]}
                              </div>
                              <div className="rounded-md border border-border bg-card px-3 py-2 text-sm whitespace-pre-wrap">
                                {a.essayText || L("(empty)", "(فارغ)")[lang]}
                              </div>
                            </div>
                            {model && (model.en || model.ar) && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                  {L("Model answer", "الإجابة النموذجية")[lang]}
                                </div>
                                <div className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground whitespace-pre-wrap">
                                  {model[lang] || model.en || model.ar}
                                </div>
                              </div>
                            )}
                            <label className="block text-xs max-w-[200px]">
                              <span className="text-muted-foreground">
                                {L("Points awarded", "النقاط الممنوحة")[lang]}
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={a.points}
                                step={0.5}
                                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                                value={getDraft(row.id, a.questionIndex, a.earned)}
                                onChange={(e) =>
                                  setDraft(
                                    row.id,
                                    a.questionIndex,
                                    Math.min(a.points, Math.max(0, Number(e.target.value) || 0)),
                                  )
                                }
                              />
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="block text-xs">
                                <span className="text-muted-foreground">
                                  {L("Teacher feedback (Arabic)", "ملاحظات المعلّم (عربي)")[lang]}
                                </span>
                                <textarea
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm min-h-[72px]"
                                  dir="rtl"
                                  value={getFeedbackDraft(row.id, a.questionIndex, a.teacherFeedback).ar}
                                  onChange={(e) =>
                                    setFeedbackDraft(row.id, a.questionIndex, { ar: e.target.value })
                                  }
                                />
                              </label>
                              <label className="block text-xs">
                                <span className="text-muted-foreground">
                                  {L("Teacher feedback (English)", "ملاحظات المعلّم (إنجليزي)")[lang]}
                                </span>
                                <textarea
                                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm min-h-[72px]"
                                  value={getFeedbackDraft(row.id, a.questionIndex, a.teacherFeedback).en}
                                  onChange={(e) =>
                                    setFeedbackDraft(row.id, a.questionIndex, { en: e.target.value })
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        );
                      }

                      const q = quizQuestions[a.questionIndex];
                      const correct = a.earned > 0;
                      return (
                        <div
                          key={`auto-${a.questionIndex}`}
                          className="rounded-lg border border-border px-4 py-3 text-sm flex flex-wrap justify-between gap-2"
                        >
                          <div>
                            <span className="text-xs text-muted-foreground uppercase">
                              {a.type === "true_false"
                                ? L("True/False", "صح/خطأ")[lang]
                                : L("MCQ", "اختيار من متعدد")[lang]}
                              {" #"}
                              {a.questionIndex + 1}
                            </span>
                            {q && (
                              <div className="font-medium mt-0.5">{q.q[lang] || q.q.en}</div>
                            )}
                          </div>
                          <span className={correct ? "text-emerald font-semibold" : "text-destructive font-semibold"}>
                            {a.earned}/{a.points}
                          </span>
                        </div>
                      );
                    })}

                    {essayItems.length > 0 && (
                      <button
                        type="button"
                        disabled={savingId === row.id}
                        onClick={() => void handleSaveReview(row)}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-emerald disabled:opacity-50"
                      >
                        {savingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {L("Save review & final score", "حفظ المراجعة والدرجة النهائية")[lang]}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
