import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { Bi, QuizQuestion } from "@/lib/curriculum";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import { LANG_OPTIONS, isRtlLang, type Lang } from "@/lib/i18n-config";
import {
  LESSON_LANGS,
  type LessonLang,
  isLessonLang,
  parseLocalizedText,
  serializeLocalizedText,
  setLocalizedLang,
} from "@/lib/lesson-localized";
import {
  isQaFixtureLessonFields,
  isLessonLangSlotMissing,
  readLessonLangSlot,
  validateQuizAnswerConsistency,
} from "@/lib/lesson-multilingual-resolve";
import { useI18n, L } from "@/lib/i18n";
import type { LessonAiReviewBundle } from "@/lib/lesson-ai-saved-content";

export type { LessonAiReviewBundle };

const TAB_LABELS: Record<LessonLang, string> = {
  ar: "العربية",
  en: "English",
  fr: "Français",
  de: "Deutsch",
  ur: "اردو",
  zh: "中文",
};

const TF_LABELS: Record<LessonLang, [string, string]> = {
  ar: ["صح", "خطأ"],
  en: ["True", "False"],
  fr: ["Vrai", "Faux"],
  de: ["Wahr", "Falsch"],
  ur: ["درست", "غلط"],
  zh: ["正确", "错误"],
};

function uiLangToLessonLang(lang: Lang): LessonLang {
  return isLessonLang(lang) ? lang : "en";
}

function patchBi(bi: Bi, lessonLang: LessonLang, value: string): Bi {
  return serializeLocalizedText(setLocalizedLang(parseLocalizedText(bi), lessonLang, value));
}

function MissingTranslationNotice({
  activeLang,
  uiLang,
  onRetry,
}: {
  activeLang: LessonLang;
  uiLang: Lang;
  onRetry?: () => void;
}) {
  const label = TAB_LABELS[activeLang];
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100 space-y-2">
      <p className="flex items-start gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
        <span>
          {activeLang === "ar"
            ? "الترجمة العربية غير متوفرة — أعد محاولة الترجمة"
            : L(
                `${label} translation missing — retry translations`,
                `ترجمة ${label} غير متوفرة — أعد محاولة الترجمة`,
              )[uiLang]}
        </span>
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-amber-600/40 bg-background px-3 py-1 text-[11px] font-semibold hover:bg-muted"
        >
          {L("Retry translations", "إعادة ترجمة اللغات")[uiLang]}
        </button>
      ) : null}
    </div>
  );
}

function LocalizedField({
  label,
  bi,
  activeLang,
  uiLang,
  onChange,
  onRetryTranslations,
  multiline = false,
}: {
  label: string;
  bi: Bi;
  activeLang: LessonLang;
  uiLang: Lang;
  onChange: (next: Bi) => void;
  onRetryTranslations?: () => void;
  multiline?: boolean;
}) {
  const stored = readLessonLangSlot(bi, activeLang);
  const missing = isLessonLangSlotMissing(bi, activeLang);

  return (
    <label className="block text-xs font-medium text-foreground">
      {label} ({TAB_LABELS[activeLang]})
      {missing ? (
        <div className="mt-1">
          <MissingTranslationNotice activeLang={activeLang} uiLang={uiLang} onRetry={onRetryTranslations} />
        </div>
      ) : null}
      {multiline ? (
        <textarea
          className="lesson-input mt-1 min-h-[100px]"
          dir={isRtlLang(activeLang as Lang) ? "rtl" : "ltr"}
          value={missing ? "" : stored}
          onChange={(e) => onChange(patchBi(bi, activeLang, e.target.value))}
        />
      ) : (
        <input
          className="lesson-input mt-1"
          dir={isRtlLang(activeLang as Lang) ? "rtl" : "ltr"}
          value={missing ? "" : stored}
          onChange={(e) => onChange(patchBi(bi, activeLang, e.target.value))}
        />
      )}
    </label>
  );
}

export function LessonAiMultilingualReview({
  bundle,
  onChange,
  onRetryTranslations,
}: {
  bundle: LessonAiReviewBundle;
  onChange: (next: LessonAiReviewBundle) => void;
  onRetryTranslations?: () => void;
}) {
  const { lang } = useI18n();
  const [activeLang, setActiveLang] = useState<LessonLang>(() => uiLangToLessonLang(lang));

  const mcqQuestions = useMemo(
    () => bundle.quiz.filter((q) => q.type === "multiple_choice"),
    [bundle.quiz],
  );
  const tfQuestions = useMemo(
    () => bundle.quiz.filter((q) => q.type === "true_false"),
    [bundle.quiz],
  );
  const essayQuestions = useMemo(
    () => bundle.quiz.filter((q) => q.type === "essay"),
    [bundle.quiz],
  );

  const consistencyIssues = useMemo(() => validateQuizAnswerConsistency(bundle.quiz), [bundle.quiz]);
  const qaFixtureDetected = useMemo(
    () => isQaFixtureLessonFields(bundle.title, bundle.outcome),
    [bundle.title, bundle.outcome],
  );

  const patchBundle = (partial: Partial<LessonAiReviewBundle>) => {
    onChange({ ...bundle, ...partial });
  };

  const updateVocabItem = (index: number, patch: Partial<VocabularyItem>) => {
    const next = bundle.vocab.map((item, i) => (i === index ? { ...item, ...patch } : item));
    patchBundle({ vocab: next });
  };

  const updateQuizQuestion = (globalIndex: number, nextQuestion: QuizQuestion) => {
    const next = bundle.quiz.map((q, i) => (i === globalIndex ? nextQuestion : q));
    patchBundle({ quiz: next });
  };

  const globalIndexFor = (type: QuizQuestion["type"], typeIndex: number): number => {
    let seen = -1;
    for (let i = 0; i < bundle.quiz.length; i++) {
      if (bundle.quiz[i].type !== type) continue;
      seen += 1;
      if (seen === typeIndex) return i;
    }
    return -1;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div>
        <h4 className="font-semibold text-sm text-foreground">
          {L("Review generated languages", "مراجعة اللغات المولّدة")[lang]}
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          {L(
            "Review and edit every language before publishing. Quiz correct answers stay synchronized across languages.",
            "راجع وعدّل كل لغة قبل النشر. إجابات الاختبار الصحيحة متزامنة بين اللغات.",
          )[lang]}
        </p>
      </div>

      {qaFixtureDetected ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          {L(
            "This lesson title/outcome look like QA test data. Update them to match your real lesson before publishing.",
            "عنوان الدرس أو نواتج التعلّم تبدو كبيانات اختبار. حدّثهما ليطابقا درسك الحقيقي قبل النشر.",
          )[lang]}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {LESSON_LANGS.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setActiveLang(code)}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${
              activeLang === code
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
          >
            {TAB_LABELS[code]}
          </button>
        ))}
      </div>

      <div
        dir={isRtlLang(activeLang as Lang) ? "rtl" : "ltr"}
        className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-3"
      >
        <LocalizedField
          label={L("Lesson title", "عنوان الدرس")[lang]}
          bi={bundle.title}
          activeLang={activeLang}
          uiLang={lang}
          onChange={(title) => patchBundle({ title })}
          onRetryTranslations={onRetryTranslations}
        />
        <LocalizedField
          label={L("Learning outcome", "نواتج التعلّم")[lang]}
          bi={bundle.outcome}
          activeLang={activeLang}
          uiLang={lang}
          onChange={(outcome) => patchBundle({ outcome })}
          onRetryTranslations={onRetryTranslations}
          multiline
        />
        <LocalizedField
          label={L("Lesson summary", "ملخص الدرس")[lang]}
          bi={bundle.explanation}
          activeLang={activeLang}
          uiLang={lang}
          onChange={(explanation) => patchBundle({ explanation })}
          onRetryTranslations={onRetryTranslations}
          multiline
        />

        <section className="space-y-3 border-t border-border/60 pt-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {L("Vocabulary", "المفردات")[lang]} ({bundle.vocab.length})
          </h5>
          {bundle.vocab.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            <div className="space-y-3">
              {bundle.vocab.map((item, index) => (
                <div key={index} className="rounded-md border border-border/50 bg-background/60 p-2 space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    {L("Word", "كلمة")[lang]} {index + 1}
                  </p>
                  <LocalizedField
                    label={L("Term", "المصطلح")[lang]}
                    bi={item.word}
                    activeLang={activeLang}
                    uiLang={lang}
                    onChange={(word) => updateVocabItem(index, { word })}
                    onRetryTranslations={onRetryTranslations}
                  />
                  <LocalizedField
                    label={L("Meaning / synonym", "المعنى / المرادف")[lang]}
                    bi={item.meaning}
                    activeLang={activeLang}
                    uiLang={lang}
                    onChange={(meaning) => updateVocabItem(index, { meaning })}
                    onRetryTranslations={onRetryTranslations}
                    multiline
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 border-t border-border/60 pt-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {L("Quiz", "الاختبار")[lang]} — MCQ {mcqQuestions.length} · T/F {tfQuestions.length} ·{" "}
            {L("Essay", "مقالي")[lang]} {essayQuestions.length}
          </h5>

          {mcqQuestions.map((question, typeIndex) => {
            const globalIndex = globalIndexFor("multiple_choice", typeIndex);
            return (
              <div key={`mcq-${typeIndex}`} className="rounded-md border border-border/50 bg-background/60 p-2 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground">
                  MCQ {typeIndex + 1}
                </p>
                <LocalizedField
                  label={L("Question", "السؤال")[lang]}
                  bi={question.q}
                  activeLang={activeLang}
                  uiLang={lang}
                  onChange={(q) => updateQuizQuestion(globalIndex, { ...question, q })}
                  onRetryTranslations={onRetryTranslations}
                  multiline
                />
                <div className="space-y-2">
                  {question.options.map((opt, optIndex) => (
                    <div
                      key={optIndex}
                      className={`rounded border px-2 py-1 ${
                        question.answer === optIndex
                          ? "border-primary/60 bg-primary/5"
                          : "border-border/40"
                      }`}
                    >
                      <LocalizedField
                        label={`${L("Option", "خيار")[lang]} ${optIndex + 1}${
                          question.answer === optIndex ? ` (${L("correct", "صحيح")[lang]})` : ""
                        }`}
                        bi={opt}
                        activeLang={activeLang}
                        uiLang={lang}
                        onChange={(nextOpt) => {
                          const options = question.options.map((o, i) => (i === optIndex ? nextOpt : o));
                          updateQuizQuestion(globalIndex, { ...question, options });
                        }}
                        onRetryTranslations={onRetryTranslations}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {tfQuestions.map((question, typeIndex) => {
            const globalIndex = globalIndexFor("true_false", typeIndex);
            const [trueLabel, falseLabel] = TF_LABELS[activeLang];
            const correctLabel = question.answer === 0 ? trueLabel : falseLabel;
            return (
              <div key={`tf-${typeIndex}`} className="rounded-md border border-border/50 bg-background/60 p-2 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground">
                  T/F {typeIndex + 1}
                </p>
                <LocalizedField
                  label={L("Statement", "العبارة")[lang]}
                  bi={question.q}
                  activeLang={activeLang}
                  uiLang={lang}
                  onChange={(q) => updateQuizQuestion(globalIndex, { ...question, q })}
                  onRetryTranslations={onRetryTranslations}
                  multiline
                />
                <p className="text-xs text-foreground">
                  {L("Correct answer", "الإجابة الصحيحة")[lang]}:{" "}
                  <span className="font-semibold text-primary">{correctLabel}</span>
                </p>
              </div>
            );
          })}

          {essayQuestions.map((question, typeIndex) => {
            const globalIndex = globalIndexFor("essay", typeIndex);
            const model = question.modelAnswer ?? { en: "", ar: "" };
            return (
              <div key={`essay-${typeIndex}`} className="rounded-md border border-border/50 bg-background/60 p-2 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground">
                  {L("Essay", "مقالي")[lang]} {typeIndex + 1}
                </p>
                <LocalizedField
                  label={L("Question", "السؤال")[lang]}
                  bi={question.q}
                  activeLang={activeLang}
                  uiLang={lang}
                  onChange={(q) => updateQuizQuestion(globalIndex, { ...question, q })}
                  onRetryTranslations={onRetryTranslations}
                  multiline
                />
                <LocalizedField
                  label={L("Model answer / rubric", "الإجابة النموذجية / معايير التقييم")[lang]}
                  bi={model}
                  activeLang={activeLang}
                  uiLang={lang}
                  onChange={(modelAnswer) => updateQuizQuestion(globalIndex, { ...question, modelAnswer })}
                  onRetryTranslations={onRetryTranslations}
                  multiline
                />
              </div>
            );
          })}
        </section>

        {consistencyIssues.length > 0 ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-100 space-y-1">
            <p className="font-semibold">{L("Quiz consistency warnings", "تحذيرات اتساق الاختبار")[lang]}</p>
            <ul className="list-disc ps-4">
              {consistencyIssues.map((issue) => (
                <li key={`${issue.questionIndex}-${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {L("Supported UI languages", "لغات الواجهة")[lang]}: {LANG_OPTIONS.map((o) => o.nativeLabel).join(" · ")}
      </p>
    </div>
  );
}
