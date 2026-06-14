import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { useQuizzesFromCMS } from "@/lib/cms";
import { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/quizzes/$slug")({
  beforeLoad: () => blockParentFromStudentRoutes(),
  loader: ({ params }) => ({ slug: params.slug }),
  head: () => ({ meta: [{ title: "Quiz — Ignite Islamic Academy" }] }),
  component: QuizDetail,
  notFoundComponent: () => <div className="container-page py-20">Quiz not found.</div>,
});

function QuizDetail() {
  const { slug } = Route.useLoaderData();
  const { tr, lang } = useI18n();
  const quizzes = useQuizzesFromCMS();
  const quiz = quizzes.find((q) => q.slug === slug);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!quiz) {
    return (
      <PageShell eyebrow={tr("nav_quizzes")} title="Quiz not found" crumbs={[{ label: tr("nav_quizzes"), to: "/quizzes" }]}>
        <p className="text-muted-foreground">This quiz is not available.</p>
        <Link to="/quizzes" className="text-primary hover:underline mt-4 inline-block">Back to quizzes</Link>
      </PageShell>
    );
  }

  const score = quiz.questions.reduce((a, q, i) => a + (answers[i] === q.answer ? 1 : 0), 0);

  return (
    <PageShell
      eyebrow={quiz.grade[locale]}
      title={quiz.title[locale]}
      lead={quiz.description[locale]}
      crumbs={[{ label: tr("nav_quizzes"), to: "/quizzes" }, { label: quiz.title[locale] }]}
    >
      <div className="space-y-6 max-w-3xl">
        {quiz.questions.map((q, i) => {
          const sel = answers[i];
          const isCorrect = submitted && sel === q.answer;
          return (
            <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary mb-2">
                <HelpCircle className="h-4 w-4" /> {tr("question")} {i + 1}
              </div>
              <div className="font-medium mb-3">{q.q[locale]}</div>
              <div className="grid gap-2">
                {q.options.map((opt, oi) => {
                  const chosen = sel === oi;
                  const correctChoice = submitted && oi === q.answer;
                  const wrongChoice = submitted && chosen && oi !== q.answer;
                  return (
                    <button
                      key={oi}
                      disabled={submitted}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                      className={[
                        "text-start rounded-lg border px-4 py-2.5 text-sm transition-colors",
                        correctChoice ? "border-primary bg-primary/10 text-primary"
                          : wrongChoice ? "border-destructive bg-destructive/10 text-destructive"
                          : chosen ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary hover:text-primary",
                      ].join(" ")}
                    >
                      {opt[locale]}
                    </button>
                  );
                })}
              </div>
              {submitted && sel !== undefined && (
                <div className={`mt-3 inline-flex items-center gap-2 text-sm font-medium ${isCorrect ? "text-primary" : "text-destructive"}`}>
                  {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {isCorrect ? tr("correct") : tr("incorrect")}
                </div>
              )}
            </div>
          );
        })}

        <div className="flex items-center justify-between flex-wrap gap-4">
          {!submitted ? (
            <button
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(answers).length !== quiz.questions.length}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {tr("submit_quiz")}
            </button>
          ) : (
            <>
              <div className="font-display text-xl text-foreground">
                {tr("your_score")}: <span className="text-primary">{score}/{quiz.questions.length}</span>
              </div>
              <button
                onClick={() => { setAnswers({}); setSubmitted(false); }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
              >
                <RotateCcw className="h-4 w-4" /> {tr("retry_quiz")}
              </button>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
