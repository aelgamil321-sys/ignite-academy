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
import type { QuizQuestion } from "@/lib/curriculum";
import { fetchScopedStudents } from "@/lib/teacher-dashboard";

type SubmissionRow = {
  id: string;
  student_id: string;
  lesson_id: string;
  auto_score: number;
  percentage: number;
  status: QuizSubmissionStatus;
  answers: unknown;
  submitted_at: string;
};

export const Route = createFileRoute("/teacher/quizzes/")({
  component: TeacherQuizzesPage,
});

function TeacherQuizzesPage() {
  const { bi, biMaybe, tr } = useI18n();
  const { lessons } = useCMS();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [studentNames, setStudentNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftScores, setDraftScores] = useState<Record<string, Record<number, number>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const lessonMap = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons]);
  const lessonQuizMap = useMemo(() => {
    const m = new Map<string, QuizQuestion[]>();
    for (const l of lessons) m.set(l.id, normalizeQuizList(l.quiz ?? []));
    return m;
  }, [lessons]);

  const load = useCallback(async () => {
    setLoading(true);
    const [subRes, students] = await Promise.all([
      supabase.from("lesson_quiz_submissions").select("*").order("submitted_at", { ascending: false }),
      fetchScopedStudents(),
    ]);
    if (subRes.error) toast.error(subRes.error.message);
    else setRows((subRes.data ?? []) as SubmissionRow[]);
    setStudentNames(new Map(students.map((s) => [s.userId, s.displayName])));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveReview(row: SubmissionRow) {
    setSavingId(row.id);
    try {
      const answers = parseSubmissionAnswers(row.answers);
      const draft = draftScores[row.id] ?? {};
      const updatedAnswers: QuizSubmissionAnswerItem[] = answers.map((a) => {
        if (a.type !== "essay") return a;
        const earned = Math.min(a.points, Math.max(0, draft[a.questionIndex] ?? a.earned));
        return { ...a, earned, status: "reviewed" as const };
      });
      const autoScore =
        typeof row.auto_score === "number" && row.auto_score > 0
          ? row.auto_score
          : updatedAnswers.filter((a) => a.type !== "essay").reduce((sum, a) => sum + a.earned, 0);
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
      toast.success(tr("teacher_quiz_saved"));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("teacher_save_failed"));
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_quizzes")}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("teacher_no_quiz_submissions")}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const lesson = lessonMap.get(row.lesson_id);
            const expanded = expandedId === row.id;
            const answers = parseSubmissionAnswers(row.answers);
            return (
              <li key={row.id} className="rounded-xl border border-border bg-card p-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left"
                  onClick={() => setExpandedId(expanded ? null : row.id)}
                >
                  <div>
                    <p className="font-medium">{studentNames.get(row.student_id) ?? row.student_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {lesson ? bi(lesson.title) : row.lesson_id} · {row.percentage}% · {row.status}
                    </p>
                  </div>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expanded && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    {answers.map((ans) => {
                      if (ans.type !== "essay") return null;
                      const q = lessonQuizMap.get(row.lesson_id)?.[ans.questionIndex];
                      return (
                        <div key={ans.questionIndex} className="rounded-lg border border-border p-3 text-sm">
                          <p className="font-medium mb-1">{q ? biMaybe(q.question) : ""}</p>
                          <p className="text-muted-foreground mb-2">{ans.essayText}</p>
                          <input
                            type="number"
                            min={0}
                            max={ans.points}
                            className="w-24 rounded border border-border px-2 py-1"
                            value={draftScores[row.id]?.[ans.questionIndex] ?? ans.earned}
                            onChange={(e) =>
                              setDraftScores((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...prev[row.id],
                                  [ans.questionIndex]: Number(e.target.value),
                                },
                              }))
                            }
                          />
                          <span className="text-xs text-muted-foreground ms-2">/ {ans.points}</span>
                        </div>
                      );
                    })}
                    {row.status === "pending_review" && (
                      <button
                        type="button"
                        disabled={savingId === row.id}
                        onClick={() => void saveReview(row)}
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                      >
                        {savingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {tr("teacher_save_review")}
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
