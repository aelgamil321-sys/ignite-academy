import { HelpCircle } from "lucide-react";
import { useI18n, L } from "@/lib/i18n";
import { normalizeQuizList } from "@/lib/lesson-quiz";
import type { Bi, QuizQuestion } from "@/lib/curriculum";
import { TranslatedContentShell } from "@/components/translation-loading-indicator";

export function LessonQuizPreview({
  lessonId,
  lessonTitle,
  gradeName,
  questions: rawQuestions,
}: {
  lessonId: string;
  lessonTitle: Bi;
  gradeName: Bi;
  questions: QuizQuestion[];
}) {
  const { tr, lang, bi } = useI18n();
  const questions = normalizeQuizList(rawQuestions);
  const quizMeta = { lessonId };

  if (questions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {L("This lesson has no quiz questions yet.", "لا يوجد أسئلة اختبار لهذا الدرس بعد.")[lang]}
      </p>
    );
  }

  const typeLabel = (type: QuizQuestion["type"]) => {
    if (type === "true_false") return L("True / False", "صح / خطأ")[lang];
    if (type === "essay") return L("Essay", "سؤال مقالي")[lang];
    return L("Multiple choice", "اختيار من متعدد")[lang];
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-xs text-muted-foreground">
          {bi(gradeName, { ...quizMeta, fieldName: "grade", contentType: "general" })}
          {" · "}
          {bi(lessonTitle, { ...quizMeta, fieldName: "title", contentType: "title" })}
        </div>
        <div className="mt-1 font-display text-xl text-foreground">{tr("ls_quiz")}</div>
        <p className="mt-2 text-sm text-muted-foreground">
          {questions.length}{" "}
          {L("questions", "أسئلة")[lang]}
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                <HelpCircle className="h-3.5 w-3.5" />
                {L("Question", "سؤال")[lang]} {i + 1}
              </span>
              <span>{typeLabel(q.type)}</span>
              <span>
                {q.points} {L("pts", "نقطة")[lang]}
              </span>
            </div>
            <TranslatedContentShell>
              <p className="font-medium text-foreground break-words">
                {bi(q.q, { ...quizMeta, fieldName: `quiz_q_${i}`, contentType: "quiz_question" })}
              </p>
            </TranslatedContentShell>
            {q.type === "essay" ? (
              q.modelAnswer ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground whitespace-pre-line">
                  <span className="font-semibold text-foreground">
                    {L("Model answer", "إجابة نموذجية")[lang]}:{" "}
                  </span>
                  {bi(q.modelAnswer, {
                    ...quizMeta,
                    fieldName: `quiz_model_${i}`,
                    contentType: "quiz_feedback",
                  })}
                </div>
              ) : null
            ) : (
              <ul className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isCorrect = oi === q.answer;
                  return (
                    <li
                      key={oi}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        isCorrect
                          ? "border-primary/40 bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {bi(opt, {
                        ...quizMeta,
                        fieldName: `quiz_q_${i}_opt_${oi}`,
                        contentType: "quiz_option",
                      })}
                      {isCorrect ? (
                        <span className="ms-2 text-xs font-semibold text-primary">
                          ({L("Correct", "صحيح")[lang]})
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
