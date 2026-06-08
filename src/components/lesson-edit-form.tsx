import { useEffect, useState, type ChangeEvent } from "react";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { useCMS, type CustomLesson } from "@/lib/cms";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { uploadToStorage, formatError } from "@/lib/upload";

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
  const [yt, setYt] = useState(lesson.youtubeUrl);
  const [pdf, setPdf] = useState<{ url: string; name: string } | null>(
    lesson.pdfUrl ? { url: lesson.pdfUrl, name: lesson.pdfName ?? "PDF" } : null,
  );
  const [ppt, setPpt] = useState<{ url: string; name: string } | null>(
    lesson.pptUrl ? { url: lesson.pptUrl, name: lesson.pptName ?? "PowerPoint" } : null,
  );
  const [ws, setWs] = useState<{ url: string; name: string } | null>(
    lesson.worksheetUrl ? { url: lesson.worksheetUrl, name: lesson.worksheetName ?? "Worksheet" } : null,
  );
  const [pub, setPub] = useState(lesson.published);
  const [saving, setSaving] = useState(false);

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
    setYt(lesson.youtubeUrl);
    setPdf(lesson.pdfUrl ? { url: lesson.pdfUrl, name: lesson.pdfName ?? "PDF" } : null);
    setPpt(lesson.pptUrl ? { url: lesson.pptUrl, name: lesson.pptName ?? "PowerPoint" } : null);
    setWs(lesson.worksheetUrl ? { url: lesson.worksheetUrl, name: lesson.worksheetName ?? "Worksheet" } : null);
    setPub(lesson.published);
  }, [lesson]);

  const onFile = (setter: (v: { url: string; name: string } | null) => void, folder: string) =>
    async (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        toast.message(L("Uploading file…", "جارٍ رفع الملف…")[lang]);
        const up = await uploadToStorage(f, folder);
        setter({ url: up.url, name: up.name });
        toast.success(L("File uploaded", "تم رفع الملف")[lang]);
      } catch (err) {
        toast.error(formatError(err));
      }
    };

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
        youtubeUrl: yt,
        pdfUrl: pdf?.url ?? lesson.pdfUrl,
        pdfName: pdf?.name ?? lesson.pdfName,
        pptUrl: ppt?.url ?? lesson.pptUrl,
        pptName: ppt?.name ?? lesson.pptName,
        worksheetUrl: ws?.url ?? lesson.worksheetUrl,
        worksheetName: ws?.name ?? lesson.worksheetName,
        published: pub,
      });
      toast.success(L("Lesson updated successfully!", "تم تحديث الدرس بنجاح!")[lang]);
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
        <h2 className="font-display text-2xl text-primary">{L("Edit Lesson", "تعديل الدرس")[lang]}</h2>
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
            {grades.map((g) => <option key={g.slug} value={g.slug}>{g.name[lang]}</option>)}
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
      <Row>
        <Field label={L("Key Vocabulary (EN)", "المفردات (إنجليزي)")[lang]}>
          <input className="lesson-input" value={vocEn} onChange={(e) => setVocEn(e.target.value)} />
        </Field>
        <Field label={L("Key Vocabulary (AR)", "المفردات (عربي)")[lang]}>
          <input className="lesson-input" dir="rtl" value={vocAr} onChange={(e) => setVocAr(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={L("Student Activity (EN)", "نشاط الطالب (إنجليزي)")[lang]}>
          <textarea className="lesson-input" rows={3} value={actEn} onChange={(e) => setActEn(e.target.value)} />
        </Field>
        <Field label={L("Student Activity (AR)", "نشاط الطالب (عربي)")[lang]}>
          <textarea className="lesson-input" dir="rtl" rows={3} value={actAr} onChange={(e) => setActAr(e.target.value)} />
        </Field>
      </Row>
      <Row>
        <Field label={L("Worksheet Text (EN)", "نص ورقة العمل (إنجليزي)")[lang]}>
          <textarea className="lesson-input" rows={3} value={wsEn} onChange={(e) => setWsEn(e.target.value)} />
        </Field>
        <Field label={L("Worksheet Text (AR)", "نص ورقة العمل (عربي)")[lang]}>
          <textarea className="lesson-input" dir="rtl" rows={3} value={wsAr} onChange={(e) => setWsAr(e.target.value)} />
        </Field>
      </Row>
      <Field label={L("YouTube Video Link", "رابط فيديو يوتيوب")[lang]}>
        <input className="lesson-input" placeholder="https://www.youtube.com/watch?v=..." value={yt} onChange={(e) => setYt(e.target.value)} />
      </Field>
      <Row>
        <Field label={L("PDF Upload", "ملف PDF")[lang]}>
          <input type="file" accept=".pdf" onChange={onFile(setPdf, "lessons/pdf")} className="lesson-input" />
          {pdf && <div className="text-xs text-emerald mt-1">✓ {pdf.name}</div>}
        </Field>
        <Field label={L("PowerPoint Upload", "ملف PowerPoint")[lang]}>
          <input type="file" accept=".ppt,.pptx" onChange={onFile(setPpt, "lessons/ppt")} className="lesson-input" />
          {ppt && <div className="text-xs text-emerald mt-1">✓ {ppt.name}</div>}
        </Field>
      </Row>
      <Field label={L("Worksheet Upload", "ورقة العمل")[lang]}>
        <input type="file" onChange={onFile(setWs, "lessons/worksheet")} className="lesson-input" />
        {ws && <div className="text-xs text-emerald mt-1">✓ {ws.name}</div>}
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} className="accent-emerald h-4 w-4" />
          {L("Published (uncheck to save as draft)", "منشور (ألغِ التحديد للحفظ كمسودة)")[lang]}
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => { void submit(); }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors shadow-[var(--shadow-soft)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? L("Saving…", "جارٍ الحفظ…")[lang] : L("Save Changes", "حفظ التغييرات")[lang]}
        </button>
      </div>

      <style>{`.lesson-input{display:block;width:100%;border-radius:.5rem;border:1px solid var(--border);background:var(--background);padding:.55rem .75rem;font-size:.875rem;color:var(--foreground);}.lesson-input:focus{outline:none;border-color:var(--emerald)}`}</style>
    </div>
  );
}
