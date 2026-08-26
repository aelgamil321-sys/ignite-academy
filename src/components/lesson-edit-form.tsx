import { useEffect, useRef, useState } from "react";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import {useI18n, L } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { useCMS, type CustomLesson } from "@/lib/cms";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { LessonBilingualFileFields } from "@/components/lesson-bilingual-file-fields";
import { LessonQuizBuilder } from "@/components/lesson-quiz-builder";
import { LessonVocabBuilder } from "@/components/lesson-vocab-builder";
import { LessonAiTranslationButton } from "@/components/lesson-ai-translation-button";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import {
  bilingualFilesFromLesson,
  bilingualFilesSavePayload,
  mergeBilingualFiles,
  type BilingualLessonFiles,
} from "@/lib/lesson-bilingual-files";
import { quizQuestionsForForm, serializeQuizForSave } from "@/lib/lesson-quiz";
import type { QuizQuestion } from "@/lib/curriculum";


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
  allowedGrades,
}: {
  lesson: CustomLesson;
  onSaved: () => void;
  onCancel: () => void;
  allowedGrades?: string[];
}) {
  const { lang, bi } = useI18n();
  const { updateLesson } = useCMS();

  const [grade, setGrade] = useState(lesson.grade);
  const [unitEn, setUnitEn] = useState(lesson.unit.en);
  const [unitAr, setUnitAr] = useState(lesson.unit.ar);
  const [titleEn, setTitleEn] = useState(lesson.title.en);
  const [titleAr, setTitleAr] = useState(lesson.title.ar);
  const [outEn, setOutEn] = useState(lesson.outcome.en);
  const [outAr, setOutAr] = useState(lesson.outcome.ar);
  const [expEn, setExpEn] = useState(lesson.explanation.en);
  const [expAr, setExpAr] = useState(lesson.explanation.ar);
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
  const bilingualLessonId = useRef<string | null>(null);
  const quizLessonId = useRef<string | null>(null);

  useEffect(() => {
    setGrade(lesson.grade);
    setUnitEn(lesson.unit.en);
    setUnitAr(lesson.unit.ar);
    setTitleEn(lesson.title.en);
    setTitleAr(lesson.title.ar);
    setOutEn(lesson.outcome.en);
    setOutAr(lesson.outcome.ar);
    setExpEn(lesson.explanation.en);
    setExpAr(lesson.explanation.ar);
    setVocab(lesson.vocab);
    setYtAr((lesson.youtubeArUrl ?? "").trim());
    setYtEn(
      (lesson.youtubeEnUrl ?? "").trim() || (!(lesson.youtubeArUrl ?? "").trim() ? (lesson.youtubeUrl ?? "").trim() : ""),
    );
    setPub(lesson.published);
  }, [lesson]);

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

  const submit = async () => {
    if (!titleEn.trim() || !titleAr.trim()) {
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

    try {
      await updateLesson(lesson.id, {
        grade: gradeSlug,
        unit: { en: unitEn, ar: unitAr },
        title: { en: titleEn, ar: titleAr },
        outcome: { en: outEn, ar: outAr },
        explanation: { en: expEn, ar: expAr },
        vocab,
        youtubeUrl: legacyYoutube,
        youtubeArUrl: ytArTrim,
        youtubeEnUrl: ytEnTrim,
        published: pub,
        quiz: serializeQuizForSave(quiz),
        ...bilingualFilesSavePayload(mergedFiles, baselineFiles),
      });
      toast.success(L("Lesson updated successfully!", "تم تحديث الدرس بنجاح!")[lang]);
      onSaved();
    } catch {
      // CMS layer already shows the error toast
    } finally {
      setSaving(false);
    }
  };

  const gradeOptions = allowedGrades
    ? grades.filter((g) => allowedGrades.includes(g.slug))
    : grades;

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-foreground">{L("Edit Lesson", "تعديل الدرس")[lang]}</h2>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          <X className="h-4 w-4" /> {L("Cancel", "إلغاء")[lang]}
        </button>
      </div>

      <Row>
        <Field label={L("Grade", "الصف")[lang]}>
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className="lesson-input">
            {gradeOptions.map((g) => <option key={g.slug} value={g.slug}>{bi(g.name)}</option>)}
          </select>
        </Field>
      </Row>
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

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="accent-primary h-4 w-4" />
          {L("Published (uncheck to save as draft)", "منشور (ألغِ التحديد للحفظ كمسودة)")[lang]}
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => { void submit(); }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-[var(--shadow-soft)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? L("Saving…", "جارٍ الحفظ…")[lang] : L("Save Changes", "حفظ التغييرات")[lang]}
        </button>
      </div>

      <style>{`.lesson-input{display:block;width:100%;border-radius:.5rem;border:1px solid var(--border);background:var(--background);padding:.55rem .75rem;font-size:.875rem;color:var(--foreground);}.lesson-input:focus{outline:none;border-color:var(--primary)}`}</style>
    </div>
  );
}
