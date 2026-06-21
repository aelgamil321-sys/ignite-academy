import { Plus, Trash2 } from "lucide-react";
import {useI18n, L } from "@/lib/i18n";
import { contentLocale, pickBiLocale } from "@/lib/i18n-config";
import type { QuizQuestion, QuizQuestionType } from "@/lib/curriculum";
import {
  emptyEssayQuestion,
  emptyMultipleChoiceQuestion,
  emptyTrueFalseQuestion,
  TRUE_FALSE_OPTIONS,
} from "@/lib/lesson-quiz";

const ESSAY_TYPE = "essay" as const;
const ESSAY_LABEL = "Essay / سؤال مقالي";

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function questionType(q: QuizQuestion): QuizQuestionType {
  return q.type ?? "multiple_choice";
}

function isEssay(q: QuizQuestion): boolean {
  return questionType(q) === ESSAY_TYPE;
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
    const base =
      type === "true_false"
        ? emptyTrueFalseQuestion()
        : type === ESSAY_TYPE
          ? emptyEssayQuestion()
          : emptyMultipleChoiceQuestion();
    onChange(
      questions.map((q, i) =>
        i === index
          ? {
              ...q,
              type,
              options: base.options.map((o) => ({ ...o })),
              answer: 0,
              modelAnswer: base.modelAnswer,
            }
          : q,
      ),
    );
  };

  const addQuestion = (type: QuizQuestionType) => {
    const q =
      type === "true_false"
        ? emptyTrueFalseQuestion()
        : type === ESSAY_TYPE
          ? emptyEssayQuestion()
          : emptyMultipleChoiceQuestion();
    onChange([...questions, q]);
  };

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-display text-lg text-foreground">
            {L("Quiz Builder", "منشئ الاختبار")[lang]}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {L(
              "Add multiple choice, true/false, or essay questions linked to this lesson.",
              "أضف أسئلة اختيار من متعدد أو صح/خطأ أو مقالية مرتبطة بهذا الدرس.",
            )[lang]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addQuestion("multiple_choice")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {L("Multiple Choice", "اختيار من متعدد")[lang]}
          </button>
          <button
            type="button"
            onClick={() => addQuestion("true_false")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {L("True / False", "صح / خطأ")[lang]}
          </button>
          <button
            type="button"
            onClick={() => addQuestion(ESSAY_TYPE)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {ESSAY_LABEL}
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          {L("No quiz questions yet. Add a question above.", "لا توجد أسئلة بعد. أضف سؤالاً أعلاه.")[lang]}
        </p>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => {
            const essay = isEssay(q);
            const qType = questionType(q);

            return (
              <div key={i} className="rounded-lg border border-border p-4 bg-card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs uppercase tracking-wider text-primary font-semibold">
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
                      value={qType}
                      onChange={(e) => setType(i, e.target.value as QuizQuestionType)}
                    >
                      <option value="multiple_choice">
                        {L("Multiple choice", "اختيار من متعدد")[lang]}
                      </option>
                      <option value="true_false">{L("True / False", "صح / خطأ")[lang]}</option>
                      <option value={ESSAY_TYPE}>{ESSAY_LABEL}</option>
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
                  <label className="block text-xs">
                    <span className="text-muted-foreground">
                      {L("Question (Arabic)", "السؤال (عربي)")[lang]}
                    </span>
                    <input
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                  </label>
                  <label className="block text-xs">
                    <span className="text-muted-foreground">
                      {L("Question (English)", "السؤال (إنجليزي)")[lang]}
                    </span>
                    <input
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
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
                  </label>
                </Row>

                {essay ? (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {L("Model answer (optional)", "الإجابة النموذجية (اختياري)")[lang]}
                    </div>
                    <Row>
                      <label className="block text-xs">
                        <span className="text-muted-foreground">
                          {L("Model answer (Arabic)", "الإجابة النموذجية (عربي)")[lang]}
                        </span>
                        <textarea
                          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
                          dir="rtl"
                          placeholder={L("Model answer (Arabic)", "الإجابة النموذجية (عربي)")[lang]}
                          value={q.modelAnswer?.ar ?? ""}
                          onChange={(e) =>
                            updateQuestion(i, {
                              modelAnswer: { en: q.modelAnswer?.en ?? "", ar: e.target.value },
                            })
                          }
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="text-muted-foreground">
                          {L("Model answer (English)", "الإجابة النموذجية (إنجليزي)")[lang]}
                        </span>
                        <textarea
                          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
                          placeholder={L("Model answer (English)", "الإجابة النموذجية (إنجليزي)")[lang]}
                          value={q.modelAnswer?.en ?? ""}
                          onChange={(e) =>
                            updateQuestion(i, {
                              modelAnswer: { en: e.target.value, ar: q.modelAnswer?.ar ?? "" },
                            })
                          }
                        />
                      </label>
                    </Row>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {L("Options — select correct answer", "الخيارات — اختر الإجابة الصحيحة")[lang]}
                    </div>
                    {(qType === "true_false" ? TRUE_FALSE_OPTIONS : q.options).map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`quiz-ans-${i}`}
                          checked={q.answer === oi}
                          onChange={() => updateQuestion(i, { answer: oi })}
                          className="accent-primary shrink-0"
                        />
                        {qType === "true_false" ? (
                          <span className="text-sm">{pickBiLocale(opt, contentLocale(lang))}</span>
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

                    {qType !== "true_false" && (
                      <button
                        type="button"
                        onClick={() =>
                          updateQuestion(i, {
                            options: [...q.options, { en: "", ar: "" }],
                          })
                        }
                        className="text-xs text-primary hover:text-primary font-semibold"
                      >
                        + {L("Add option", "إضافة خيار")[lang]}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
