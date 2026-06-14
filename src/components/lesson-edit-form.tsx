import { useEffect, useRef, useState } from "react";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { useCMS, type CustomLesson } from "@/lib/cms";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { LessonBilingualFileFields } from "@/components/lesson-bilingual-file-fields";
import { LessonQuizBuilder } from "@/components/lesson-quiz-builder";
import {
  bilingualFilesFromLesson,
  bilingualFilesSavePayload,
  mergeBilingualFiles,
  type BilingualLessonFiles,
} from "@/lib/lesson-bilingual-files";
import { quizQuestionsForForm, serializeQuizForSave } from "@/lib/lesson-quiz";
import type { QuizQuestion } from "@/lib/curriculum";

const L = (en: string, ar: string) => ({ en, ar });

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
}: {
  lesson: CustomLesson;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { lang } = useI18n();
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
  const [vocEn, setVocEn] = useState(lesson.vocab.en);
  const [vocAr, setVocAr] = useState(lesson.vocab.ar);
  const [actEn, setActEn] = useState(lesson.activity.en);
  const [actAr, setActAr] = useState(lesson.activity.ar);
  const [wsEn, setWsEn] = useState(lesson.worksheetText.en);
  const [wsAr, setWsAr] = useState(lesson.worksheetText.ar);
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
    setVocEn(lesson.vocab.en);
    setVocAr(lesson.vocab.ar);
    setActEn(lesson.activity.en);
    setActAr(lesson.activity.ar);
    setWsEn(lesson.worksheetText.en);
    setWsAr(lesson.worksheetText.ar);
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
      toast.error(L("Title (English) and Title (Arabic) are required", "العنوان (إنجليزي) والعنوان (عربي) مطلوبان")[locale]);
      return;
    }
    if (!grade) {
      toast.error(L("Grade is required", "الصف مطلوب")[locale]);
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
        vocab: { en: vocEn, ar: vocAr },
        activity: { en: actEn, ar: actAr },
        worksheetText: { en: wsEn, ar: wsAr },
        youtubeUrl: legacyYoutube,
        youtubeArUrl: ytArTrim,
        youtubeEnUrl: ytEnTrim,
        published: pub,
        quiz: serializeQuizForSave(quiz),
        ...bilingualFilesSavePayload(mergedFiles, baselineFiles),
      });
      toast.success(L("Lesson updated successfully!", "تم تحديث الدرس بنجاح!")[locale]);
      onSaved();
    } catch {
      // CMS layer already shows the error toast
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-soft)] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-foreground">{L("Edit Lesson", "تعديل الدرس")[locale]}</h2>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          <X className="h-4 w-4" /> {L("Cancel", "إلغاء")[locale]}
        </button>
      </div>

      <Row>
        <Field label={L("Grade", "الصف")[locale]}>
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className="lesson-input">
            {grades.map((g) => <option key={g.slug} value={g.slug}>{g.name[locale]}</option>)}
          </select>
        </Field>
      </Row>
      <Row>
        <Field label={L("Unit (English)", "الوحدة (إنجليزي)")[locale]}>
          <input className="lesson-input" value={unitEn} onChange={(e) => setUnitEn(e.target.value)} />
        </Field>
        <Field label={L("Unit (Arabic)", "الوحدة (عربي)")[locale]}>
          <input className="lesson-input" dir="rtl" value={unitAr} onChange={(e) => setUnitAr(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={L("Title (English)", "العنوان (إنجليزي)")[locale]} required>
          <input className="lesson-input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
        </Field>
        <Field label={L("Title (Arabic)", "العنوان (عربي)")[locale]} required>
          <input className="lesson-input" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={L("Learning Outcome (EN)", "نواتج التعلّم (إنجليزي)")[locale]}>
          <textarea className="lesson-input" rows={3} value={outEn} onChange={(e) => setOutEn(e.target.value)} />
        </Field>
        <Field label={L("Learning Outcome (AR)", "نواتج التعلّم (عربي)")[locale]}>
          <textarea className="lesson-input" dir="rtl" rows={3} value={outAr} onChange={(e) => setOutAr(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={L("Lesson Content (EN)", "محتوى الدرس (إنجليزي)")[locale]}>
          <textarea className="lesson-input" rows={5} value={expEn} onChange={(e) => setExpEn(e.target.value)} />
        </Field>
        <Field label={L("Lesson Content (AR)", "محتوى الدرس (عربي)")[locale]}>
          <textarea className="lesson-input" dir="rtl" rows={5} value={expAr} onChange={(e) => setExpAr(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={L("Key Vocabulary (EN)", "المفردات (إنجليزي)")[locale]}>
          <input className="lesson-input" value={vocEn} onChange={(e) => setVocEn(e.target.value)} />
        </Field>
        <Field label={L("Key Vocabulary (AR)", "المفردات (عربي)")[locale]}>
          <input className="lesson-input" dir="rtl" value={vocAr} onChange={(e) => setVocAr(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={L("Student Activity (EN)", "نشاط الطالب (إنجليزي)")[locale]}>
          <textarea className="lesson-input" rows={3} value={actEn} onChange={(e) => setActEn(e.target.value)} />
        </Field>
        <Field label={L("Student Activity (AR)", "نشاط الطالب (عربي)")[locale]}>
          <textarea className="lesson-input" dir="rtl" rows={3} value={actAr} onChange={(e) => setActAr(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={L("Worksheet Text (EN)", "نص ورقة العمل (إنجليزي)")[locale]}>
          <textarea className="lesson-input" rows={3} value={wsEn} onChange={(e) => setWsEn(e.target.value)} />
        </Field>
        <Field label={L("Worksheet Text (AR)", "نص ورقة العمل (عربي)")[locale]}>
          <textarea className="lesson-input" dir="rtl" rows={3} value={wsAr} onChange={(e) => setWsAr(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={L("YouTube Video Link (Arabic)", "رابط فيديو يوتيوب (عربي)")[locale]}>
          <input className="lesson-input" dir="rtl" placeholder="https://www.youtube.com/watch?v=..." value={ytAr} onChange={(e) => setYtAr(e.target.value)} />
        </Field>
        <Field label={L("YouTube Video Link (English)", "رابط فيديو يوتيوب (إنجليزي)")[locale]}>
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
          {L("Published (uncheck to save as draft)", "منشور (ألغِ التحديد للحفظ كمسودة)")[locale]}
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => { void submit(); }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-[var(--shadow-soft)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? L("Saving…", "جارٍ الحفظ…")[locale] : L("Save Changes", "حفظ التغييرات")[locale]}
        </button>
      </div>

      <style>{`.lesson-input{display:block;width:100%;border-radius:.5rem;border:1px solid var(--border);background:var(--background);padding:.55rem .75rem;font-size:.875rem;color:var(--foreground);}.lesson-input:focus{outline:none;border-color:var(--primary)}`}</style>
    </div>
  );
}
