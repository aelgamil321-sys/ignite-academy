import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { QuizQuestion, QuizQuestionType } from "@/lib/curriculum";
import {
  emptyMultipleChoiceQuestion,
  emptyTrueFalseQuestion,
  TRUE_FALSE_OPTIONS,
} from "@/lib/lesson-quiz";

const L = (en: string, ar: string) => ({ en, ar });

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

export function LessonQuizBuilder({
  questions,
  onChange,
}: {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
}) {
  const { lang } = useI18n();

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const setType = (index: number, type: QuizQuestionType) => {
    const base = type === "true_false" ? emptyTrueFalseQuestion() : emptyMultipleChoiceQuestion();
    const current = questions[index];
    onChange(
      questions.map((q, i) =>
        i === index
          ? {
              ...q,
              type,
              options: base.options.map((o) => ({ ...o })),
              answer: 0,
            }
          : q,
      ),
    );
  };

  const addQuestion = (type: QuizQuestionType) => {
    const q = type === "true_false" ? emptyTrueFalseQuestion() : emptyMultipleChoiceQuestion();
    onChange([...questions, q]);
  };

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-lg text-primary">
            {L("Quiz Builder", "منشئ الاختبار")[lang]}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {L("Add multiple choice or true/false questions linked to this lesson.", "أضف أسئلة اختيار من متعدد أو صح/خطأ مرتبطة بهذا الدرس.")[lang]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addQuestion("multiple_choice")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-emerald hover:text-emerald"
          >
            <Plus className="h-3.5 w-3.5" />
            {L("Multiple Choice", "اختيار من متعدد")[lang]}
          </button>
          <button
            type="button"
            onClick={() => addQuestion("true_false")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-emerald hover:text-emerald"
          >
            <Plus className="h-3.5 w-3.5" />
            {L("True / False", "صح / خطأ")[lang]}
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          {L("No quiz questions yet. Add a question above.", "لا توجد أسئلة بعد. أضف سؤالاً أعلاه.")[lang]}
        </p>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-border p-4 bg-card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-wider text-emerald font-semibold">
                  {L("Question", "سؤال")[lang]} {i + 1}
                </div>
                <button
                  type="button"
                  onClick={() => onChange(questions.filter((_, j) => j !== i))}
                  className="text-destructive hover:text-destructive/70"
                  aria-label={L("Remove question", "حذف السؤال")[lang]}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <Row>
                <label className="block text-xs">
                  <span className="text-muted-foreground">{L("Type", "النوع")[lang]}</span>
                  <select
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    value={q.type ?? "multiple_choice"}
                    onChange={(e) => setType(i, e.target.value as QuizQuestionType)}
                  >
                    <option value="multiple_choice">{L("Multiple choice", "اختيار من متعدد")[lang]}</option>
                    <option value="true_false">{L("True / False", "صح / خطأ")[lang]}</option>
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="text-muted-foreground">{L("Points", "النقاط")[lang]}</span>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    value={q.points ?? 1}
                    onChange={(e) =>
                      updateQuestion(i, { points: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </label>
              </Row>

              <Row>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder={L("Question (English)", "السؤال (إنجليزي)")[lang]}
                  value={q.q.en}
                  onChange={(e) =>
                    onChange(
                      questions.map((x, j) =>
                        j === i ? { ...x, q: { ...x.q, en: e.target.value } } : x,
                      ),
                    )
                  }
                />
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  dir="rtl"
                  placeholder={L("Question (Arabic)", "السؤال (عربي)")[lang]}
                  value={q.q.ar}
                  onChange={(e) =>
                    onChange(
                      questions.map((x, j) =>
                        j === i ? { ...x, q: { ...x.q, ar: e.target.value } } : x,
                      ),
                    )
                  }
                />
              </Row>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {L("Options — select correct answer", "الخيارات — اختر الإجابة الصحيحة")[lang]}
                </div>
                {(q.type === "true_false" ? TRUE_FALSE_OPTIONS : q.options).map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`quiz-ans-${i}`}
                      checked={q.answer === oi}
                      onChange={() => updateQuestion(i, { answer: oi })}
                      className="accent-emerald shrink-0"
                    />
                    {q.type === "true_false" ? (
                      <span className="text-sm">{lang === "ar" ? opt.ar : opt.en}</span>
                    ) : (
                      <>
                        <input
                          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                          placeholder={`${L("Option", "خيار")[lang]} ${oi + 1} (EN)`}
                          value={q.options[oi]?.en ?? ""}
                          onChange={(e) =>
                            onChange(
                              questions.map((x, j) =>
                                j === i
                                  ? {
                                      ...x,
                                      options: x.options.map((o, k) =>
                                        k === oi ? { ...o, en: e.target.value } : o,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                        <input
                          className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                          dir="rtl"
                          placeholder={`${L("Option", "خيار")[lang]} ${oi + 1} (AR)`}
                          value={q.options[oi]?.ar ?? ""}
                          onChange={(e) =>
                            onChange(
                              questions.map((x, j) =>
                                j === i
                                  ? {
                                      ...x,
                                      options: x.options.map((o, k) =>
                                        k === oi ? { ...o, ar: e.target.value } : o,
                                      ),
                                    }
                                  : x,
                              ),
                            )
                          }
                        />
                      </>
                    )}
                  </div>
                ))}

                {q.type !== "true_false" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(i, {
                        options: [...q.options, { en: "", ar: "" }],
                      })
                    }
                    className="text-xs text-primary hover:text-emerald font-semibold"
                  >
                    + {L("Add option", "إضافة خيار")[lang]}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
