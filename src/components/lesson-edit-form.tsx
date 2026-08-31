import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n, L } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { useCMS, type CustomLesson } from "@/lib/cms";
import { normalizeGradeSlug, gradeMatches } from "@/lib/grade-utils";
import { LessonBilingualFileFields } from "@/components/lesson-bilingual-file-fields";
import { LessonMainFileField } from "@/components/lesson-main-file-field";
import { LessonQuizBuilder } from "@/components/lesson-quiz-builder";
import { LessonVocabBuilder } from "@/components/lesson-vocab-builder";
import { LessonAiGeneratePanel, type LessonAiGeneratedPayload } from "@/components/lesson-ai-generate-panel";
import { LessonAiTranslationButton } from "@/components/lesson-ai-translation-button";
import { TeacherLessonPublishButton } from "@/components/teacher-lesson-publish-button";
import { TeacherLessonStatusBadge } from "@/components/teacher-lesson-status-badge";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import {
  bilingualFilesFromLesson,
  bilingualFilesSavePayload,
  mergeBilingualFiles,
  type BilingualLessonFiles,
} from "@/lib/lesson-bilingual-files";
import { hasMainLessonFile, resolveMainLessonFile } from "@/lib/lesson-main-file";
import { quizQuestionsForForm, serializeQuizForSave } from "@/lib/lesson-quiz";
import type { Bi, QuizQuestion } from "@/lib/curriculum";
import { mergeLocalizedTexts, parseLocalizedText } from "@/lib/lesson-localized";
import {
  buildLessonAiReviewBundleFromLesson,
  lessonHasSavedAiGeneratedContent,
} from "@/lib/lesson-ai-saved-content";
import { biForLessonForm } from "@/lib/lesson-edit-safe";

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-destructive ms-1">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function LessonEditForm({
  lesson,
  onSaved,
  onCancel,
  onPublishChange,
  allowedGrades,
  readOnly = false,
  formMode = "full",
}: {
  lesson: CustomLesson;
  onSaved: () => void;
  onCancel: () => void;
  /** Optional parent sync after publish/unpublish without reloading lesson row. */
  onPublishChange?: (published: boolean) => void;
  allowedGrades?: string[];
  readOnly?: boolean;
  /** Teacher workflow: compact core fields + collapsed advanced section. */
  formMode?: "full" | "simplified";
}) {
  const { lang, bi } = useI18n();
  const { updateLesson } = useCMS();
  const simplified = formMode === "simplified";

  const unitBi = biForLessonForm(lesson.unit);
  const titleBi = biForLessonForm(lesson.title);
  const outcomeBi = biForLessonForm(lesson.outcome);
  const explanationBi = biForLessonForm(lesson.explanation);

  const [grade, setGrade] = useState(lesson.grade);
  const [unitEn, setUnitEn] = useState(unitBi.en);
  const [unitAr, setUnitAr] = useState(unitBi.ar);
  const [titleEn, setTitleEn] = useState(titleBi.en);
  const [titleAr, setTitleAr] = useState(titleBi.ar);
  const [outEn, setOutEn] = useState(outcomeBi.en);
  const [outAr, setOutAr] = useState(outcomeBi.ar);
  const [expEn, setExpEn] = useState(explanationBi.en);
  const [expAr, setExpAr] = useState(explanationBi.ar);
  const [vocab, setVocab] = useState<VocabularyItem[]>(lesson.vocab);
  const [ytAr, setYtAr] = useState((lesson.youtubeArUrl ?? "").trim());
  const [ytEn, setYtEn] = useState(
    (lesson.youtubeEnUrl ?? "").trim() || (!(lesson.youtubeArUrl ?? "").trim() ? (lesson.youtubeUrl ?? "").trim() : ""),
  );
  const [pub, setPub] = useState(lesson.published);
  const [bilingualFiles, setBilingualFiles] = useState<BilingualLessonFiles>(
    bilingualFilesFromLesson(lesson),
  );
  const [quiz, setQuiz] = useState<QuizQuestion[]>(() => quizQuestionsForForm(lesson.quiz));
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedDetailsRef = useRef<HTMLDetailsElement>(null);
  const bilingualLessonId = useRef<string | null>(null);
  const quizLessonId = useRef<string | null>(null);
  const localizedSnapshotRef = useRef<{
    title?: Bi;
    unit?: Bi;
    outcome?: Bi;
    explanation?: Bi;
  }>({
    title: titleBi,
    unit: unitBi,
    outcome: outcomeBi,
    explanation: explanationBi,
  });

  useEffect(() => {
    setPub(lesson.published);
  }, [lesson.id, lesson.published]);

  useEffect(() => {
    const nextUnit = biForLessonForm(lesson.unit);
    const nextTitle = biForLessonForm(lesson.title);
    const nextOutcome = biForLessonForm(lesson.outcome);
    const nextExplanation = biForLessonForm(lesson.explanation);
    setGrade(lesson.grade);
    setUnitEn(nextUnit.en);
    setUnitAr(nextUnit.ar);
    setTitleEn(nextTitle.en);
    setTitleAr(nextTitle.ar);
    setOutEn(nextOutcome.en);
    setOutAr(nextOutcome.ar);
    setExpEn(nextExplanation.en);
    setExpAr(nextExplanation.ar);
    setVocab(lesson.vocab);
    localizedSnapshotRef.current = {
      title: nextTitle,
      unit: nextUnit,
      outcome: nextOutcome,
      explanation: nextExplanation,
    };
    setYtAr((lesson.youtubeArUrl ?? "").trim());
    setYtEn(
      (lesson.youtubeEnUrl ?? "").trim() || (!(lesson.youtubeArUrl ?? "").trim() ? (lesson.youtubeUrl ?? "").trim() : ""),
    );
  }, [lesson.id]);

  useEffect(() => {
    if (bilingualLessonId.current === lesson.id) return;
    bilingualLessonId.current = lesson.id;
    setBilingualFiles(bilingualFilesFromLesson(lesson));
  }, [lesson.id]);

  useEffect(() => {
    if (quizLessonId.current === lesson.id) return;
    quizLessonId.current = lesson.id;
    setQuiz(quizQuestionsForForm(lesson.quiz));
  }, [lesson.id]);

  const unitValue = lang === "ar" ? unitAr : unitEn;
  const setUnitValue = (value: string) => {
    if (simplified) {
      setUnitEn(value);
      setUnitAr(value);
      return;
    }
    if (lang === "ar") setUnitAr(value);
    else setUnitEn(value);
  };
  const titleValue = lang === "ar" ? titleAr : titleEn;
  const setTitleValue = (value: string) => {
    if (lang === "ar") setTitleAr(value);
    else setTitleEn(value);
  };
  const outcomeValue = lang === "ar" ? outAr : outEn;
  const setOutcomeValue = (value: string) => {
    if (lang === "ar") setOutAr(value);
    else setOutEn(value);
  };

  const mainFile = resolveMainLessonFile(bilingualFiles, lesson, lang);
  const coreFieldsValid =
    Boolean(unitValue.trim()) &&
    Boolean(titleValue.trim()) &&
    Boolean(outcomeValue.trim()) &&
    hasMainLessonFile(bilingualFiles, lesson);

  const savedAiReviewBundle = useMemo(() => {
    try {
      if (!lessonHasSavedAiGeneratedContent(lesson)) return null;
      return buildLessonAiReviewBundleFromLesson(lesson);
    } catch (error) {
      console.error("[LessonEditForm] saved AI review bundle hydrate failed", error);
      return null;
    }
  }, [lesson]);

  const handleAiGenerated = (payload: LessonAiGeneratedPayload) => {
    const title = parseLocalizedText(payload.title);
    const unit = parseLocalizedText(payload.unit);
    const outcome = parseLocalizedText(payload.outcome);
    const explanation = parseLocalizedText(payload.explanation);
    localizedSnapshotRef.current = { title, unit, outcome, explanation };
    setTitleEn(title.en);
    setTitleAr(title.ar);
    const unitCanonical = unit.en?.trim() || unit.ar?.trim() || "";
    setUnitEn(unitCanonical);
    setUnitAr(unitCanonical);
    setOutEn(outcome.en);
    setOutAr(outcome.ar);
    setExpEn(explanation.en);
    setExpAr(explanation.ar);
    setVocab(payload.vocab);
    setQuiz(quizQuestionsForForm(payload.quiz));
    setAdvancedOpen(true);
    if (advancedDetailsRef.current) advancedDetailsRef.current.open = true;
  };

  const submit = async () => {
    if (simplified) {
      if (!unitValue.trim()) {
        toast.error(L("Unit number is required", "رقم الوحدة مطلوب")[lang]);
        return;
      }
      if (!titleValue.trim()) {
        toast.error(L("Lesson name is required", "اسم الدرس مطلوب")[lang]);
        return;
      }
      if (!outcomeValue.trim()) {
        toast.error(L("Learning outcome is required", "نواتج التعلّم مطلوبة")[lang]);
        return;
      }
      if (!hasMainLessonFile(bilingualFiles, lesson)) {
        toast.error(L("Main lesson file is required", "ملف الدرس الرئيسي مطلوب")[lang]);
        return;
      }
    } else if (!titleEn.trim() || !titleAr.trim()) {
      toast.error(L("Title (English) and Title (Arabic) are required", "العنوان (إنجليزي) والعنوان (عربي) مطلوبان")[lang]);
      return;
    }

    if (!grade) {
      toast.error(L("Grade is required", "الصف مطلوب")[lang]);
      return;
    }

    setSaving(true);
    const gradeSlug = normalizeGradeSlug(grade);
    const ytArTrim = ytAr.trim();
    const ytEnTrim = ytEn.trim();
    const legacyYoutube = ytEnTrim || ytArTrim;

    const baselineFiles = bilingualFilesFromLesson(lesson);
    const mergedFiles = mergeBilingualFiles(bilingualFiles, baselineFiles);

    const localized = localizedSnapshotRef.current;
    const titlePayload: Bi = mergeLocalizedTexts(localized.title ?? {}, { en: titleEn, ar: titleAr });
    const unitCanonical = (unitEn.trim() || unitAr.trim());
    const unitPayload: Bi = mergeLocalizedTexts(localized.unit ?? {}, {
      en: unitCanonical,
      ar: unitCanonical,
    });
    const outcomePayload: Bi = mergeLocalizedTexts(localized.outcome ?? {}, { en: outEn, ar: outAr });
    const explanationPayload: Bi = mergeLocalizedTexts(localized.explanation ?? {}, { en: expEn, ar: expAr });

    try {
      await updateLesson(lesson.id, {
        grade: gradeSlug,
        unit: unitPayload,
        title: titlePayload,
        outcome: outcomePayload,
        explanation: explanationPayload,
        vocab,
        youtubeUrl: legacyYoutube,
        youtubeArUrl: ytArTrim,
        youtubeEnUrl: ytEnTrim,
        published: pub,
        quiz: serializeQuizForSave(quiz),
        ...bilingualFilesSavePayload(mergedFiles, baselineFiles),
      });
      toast.success(
        (simplified && !pub
          ? L("Draft saved successfully!", "تم حفظ المسودة بنجاح!")
          : L("Lesson updated successfully!", "تم تحديث الدرس بنجاح!"))[lang],
      );
      onSaved();
    } catch {
      // CMS layer already shows the error toast
    } finally {
      setSaving(false);
    }
  };

  const gradeOptions = allowedGrades
    ? grades.filter((g) => allowedGrades.some((assigned) => gradeMatches(g.slug, assigned)))
    : grades;

  const isNewStub =
    (titleEn.trim() === "New lesson" && titleAr.trim() === "درس جديد") ||
    (!titleEn.trim() && !titleAr.trim() && !outEn.trim() && !outAr.trim());

  const pageTitle = simplified
    ? (isNewStub ? L("Create Lesson", "إنشاء درس") : L("Edit Lesson", "تعديل الدرس"))[lang]
    : L("Edit Lesson", "تعديل الدرس")[lang];

  const advancedFields = (
    <>
      {simplified ? (
        <Row>
          <Field label={L("Unit (English)", "الوحدة (إنجليزي)")[lang]}>
            <input className="lesson-input" value={unitEn} onChange={(e) => setUnitEn(e.target.value)} />
          </Field>
          <Field label={L("Unit (Arabic)", "الوحدة (عربي)")[lang]}>
            <input className="lesson-input" dir="rtl" value={unitAr} onChange={(e) => setUnitAr(e.target.value)} />
          </Field>
        </Row>
      ) : null}
      {simplified ? (
        <Row>
          <Field label={L("Title (English)", "العنوان (إنجليزي)")[lang]}>
            <input className="lesson-input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </Field>
          <Field label={L("Title (Arabic)", "العنوان (عربي)")[lang]}>
            <input className="lesson-input" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
          </Field>
        </Row>
      ) : null}
      {simplified ? (
        <Row>
          <Field label={L("Learning Outcome (EN)", "نواتج التعلّم (إنجليزي)")[lang]}>
            <textarea className="lesson-input" rows={3} value={outEn} onChange={(e) => setOutEn(e.target.value)} />
          </Field>
          <Field label={L("Learning Outcome (AR)", "نواتج التعلّم (عربي)")[lang]}>
            <textarea className="lesson-input" dir="rtl" rows={3} value={outAr} onChange={(e) => setOutAr(e.target.value)} />
          </Field>
        </Row>
      ) : null}
      <Row>
        <Field label={L("Lesson Content (EN)", "محتوى الدرس (إنجليزي)")[lang]}>
          <textarea className="lesson-input" rows={5} value={expEn} onChange={(e) => setExpEn(e.target.value)} />
        </Field>
        <Field label={L("Lesson Content (AR)", "محتوى الدرس (عربي)")[lang]}>
          <textarea className="lesson-input" dir="rtl" rows={5} value={expAr} onChange={(e) => setExpAr(e.target.value)} />
        </Field>
      </Row>
      <LessonVocabBuilder
        items={vocab}
        onChange={setVocab}
        inputClassName="lesson-input"
        lessonId={lesson.id}
      />
      <LessonAiTranslationButton
        lessonId={lesson.id}
        unit={{ en: unitEn, ar: unitAr }}
        title={{ en: titleEn, ar: titleAr }}
        outcome={{ en: outEn, ar: outAr }}
        explanation={{ en: expEn, ar: expAr }}
        vocab={vocab}
        quiz={quiz}
      />
      <Row>
        <Field label={L("YouTube Video Link (Arabic)", "رابط فيديو يوتيوب (عربي)")[lang]}>
          <input className="lesson-input" dir="rtl" placeholder="https://www.youtube.com/watch?v=..." value={ytAr} onChange={(e) => setYtAr(e.target.value)} />
        </Field>
        <Field label={L("YouTube Video Link (English)", "رابط فيديو يوتيوب (إنجليزي)")[lang]}>
          <input className="lesson-input" placeholder="https://www.youtube.com/watch?v=..." value={ytEn} onChange={(e) => setYtEn(e.target.value)} />
        </Field>
      </Row>
      <LessonBilingualFileFields
        files={bilingualFiles}
        onChange={setBilingualFiles}
        lessonId={lesson.id}
        savedFiles={bilingualFilesFromLesson(lesson)}
      />
      <LessonQuizBuilder questions={quiz} onChange={setQuiz} />
      {simplified ? (
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="accent-primary h-4 w-4" />
          {L("Published (uncheck to save as draft)", "منشور (ألغِ التحديد للحفظ كمسودة)")[lang]}
        </label>
      ) : null}
    </>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-[var(--shadow-soft)] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl sm:text-2xl text-foreground">{pageTitle}</h2>
          {simplified ? <TeacherLessonStatusBadge published={pub} /> : null}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          <X className="h-4 w-4" /> {L("Cancel", "إلغاء")[lang]}
        </button>
      </div>

      {readOnly ? (
        <p className="text-sm text-muted-foreground">
          {L("This lesson is open in view mode.", "هذا الدرس مفتوح في وضع العرض.")[lang]}
        </p>
      ) : null}

      <fieldset disabled={readOnly} className={readOnly ? "opacity-80 space-y-5 border-0 p-0 m-0 min-w-0" : "space-y-5 border-0 p-0 m-0 min-w-0"}>
        <Row>
          <Field label={L("Grade", "الصف")[lang]} required>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="lesson-input">
              {gradeOptions.map((g) => <option key={g.slug} value={g.slug}>{bi(g.name)}</option>)}
            </select>
          </Field>
        </Row>

        {simplified ? (
          <>
            <Field label={L("Unit Number", "رقم الوحدة")[lang]} required>
              <input
                className="lesson-input"
                dir={lang === "ar" ? "rtl" : "ltr"}
                value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
              />
            </Field>
            <Field label={L("Lesson Name", "اسم الدرس")[lang]} required>
              <input
                className="lesson-input"
                dir={lang === "ar" ? "rtl" : "ltr"}
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
              />
            </Field>
            <Field label={L("Learning Outcome", "نواتج التعلّم")[lang]} required>
              <textarea
                className="lesson-input"
                dir={lang === "ar" ? "rtl" : "ltr"}
                rows={3}
                value={outcomeValue}
                onChange={(e) => setOutcomeValue(e.target.value)}
              />
            </Field>
            <LessonMainFileField
              files={bilingualFiles}
              onChange={setBilingualFiles}
              lessonId={lesson.id}
              lesson={lesson}
            />
            <LessonAiGeneratePanel
              lessonId={lesson.id}
              sourceLanguage={lang === "ar" ? "ar" : "en"}
              lessonTitle={titleValue}
              unitNumber={unitValue}
              learningOutcome={outcomeValue}
              mainFile={mainFile}
              coreFieldsValid={coreFieldsValid}
              savedReviewBundle={savedAiReviewBundle}
              onGenerated={handleAiGenerated}
            />
            <details
              ref={advancedDetailsRef}
              open={advancedOpen}
              onToggle={(e) => setAdvancedOpen((e.currentTarget as HTMLDetailsElement).open)}
              className="group rounded-xl border border-border bg-background"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                <span>{L("Advanced / Manual Editing", "تحرير يدوي متقدم")[lang]}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-5 border-t border-border px-4 py-4">
                {advancedFields}
              </div>
            </details>
          </>
        ) : (
          <>
            <Row>
              <Field label={L("Unit (English)", "الوحدة (إنجليزي)")[lang]}>
                <input className="lesson-input" value={unitEn} onChange={(e) => setUnitEn(e.target.value)} />
              </Field>
              <Field label={L("Unit (Arabic)", "الوحدة (عربي)")[lang]}>
                <input className="lesson-input" dir="rtl" value={unitAr} onChange={(e) => setUnitAr(e.target.value)} />
              </Field>
            </Row>
            <Row>
              <Field label={L("Title (English)", "العنوان (إنجليزي)")[lang]} required>
                <input className="lesson-input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
              </Field>
              <Field label={L("Title (Arabic)", "العنوان (عربي)")[lang]} required>
                <input className="lesson-input" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
              </Field>
            </Row>
            <Row>
              <Field label={L("Learning Outcome (EN)", "نواتج التعلّم (إنجليزي)")[lang]}>
                <textarea className="lesson-input" rows={3} value={outEn} onChange={(e) => setOutEn(e.target.value)} />
              </Field>
              <Field label={L("Learning Outcome (AR)", "نواتج التعلّم (عربي)")[lang]}>
                <textarea className="lesson-input" dir="rtl" rows={3} value={outAr} onChange={(e) => setOutAr(e.target.value)} />
              </Field>
            </Row>
            {advancedFields}
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
          {!readOnly ? (
            <>
              {!simplified ? (
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="accent-primary h-4 w-4" />
                  {L("Published (uncheck to save as draft)", "منشور (ألغِ التحديد للحفظ كمسودة)")[lang]}
                </label>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {pub
                    ? L("Students can see this lesson while it is published.", "يمكن للطلاب رؤية هذا الدرس طالما أنه منشور.")
                    : L("Saving keeps this lesson as a draft.", "الحفظ يبقي الدرس كمسودة.")[lang]}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {simplified ? (
                  <TeacherLessonPublishButton
                    lesson={lesson}
                    published={pub}
                    onUpdated={(next) => {
                      setPub(next);
                      onPublishChange?.(next);
                    }}
                  />
                ) : null}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => { void submit(); }}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-[var(--shadow-soft)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  {saving
                    ? L("Saving…", "جارٍ الحفظ…")[lang]
                    : simplified && !pub
                      ? L("Save Draft", "حفظ كمسودة")[lang]
                      : L("Save Changes", "حفظ التغييرات")[lang]}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              <X className="h-4 w-4" /> {L("Back", "رجوع")[lang]}
            </button>
          )}
        </div>
      </fieldset>

      <style>{`.lesson-input{display:block;width:100%;border-radius:.5rem;border:1px solid var(--border);background:var(--background);padding:.55rem .75rem;font-size:.875rem;color:var(--foreground);}.lesson-input:focus{outline:none;border-color:var(--primary)}`}</style>
    </div>
  );
}
