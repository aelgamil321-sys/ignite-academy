import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ChevronLeft, FileUp, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { grades } from "@/lib/curriculum";
import { gradeDisplayName, normalizeGradeSlug } from "@/lib/grade-utils";
import { useI18n, L } from "@/lib/i18n";
import {
  CREATE_MAIN_LESSON_FILE_ACCEPT,
  mainFileDbColumn,
  mainFileSlotForUpload,
  validateLessonMainFileForCreate,
} from "@/lib/lesson-main-file";
import { serializeVocabForStorage } from "@/lib/lesson-vocab";
import { uploadLessonFile, parseLessonUuid } from "@/lib/upload";
import {
  DEFAULT_TEACHING_SUBJECT,
  TEACHING_SUBJECT_TYPES,
  teachingSubjectLabel,
  type TeachingSubjectType,
} from "@/lib/teacher-assignment-subject";

const INPUT_CLASS =
  "block w-full min-w-0 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

type SubmitPhase = "idle" | "creating" | "uploading";

export type LessonCreateDraftFormProps = {
  allowedGradeSlugs: string[];
  allowedGradesBySubject?: Partial<Record<TeachingSubjectType, string[]>>;
  backTo: "/teacher/lessons" | "/admin/lessons";
  backLabel: string;
  editTo: "/teacher/lessons/edit/$lessonId" | "/admin/lessons/edit/$lessonId";
  lockGradeWhenSingle?: boolean;
};

function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Field({
  label,
  required,
  error,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="text-destructive ms-1">*</span>}
      </span>
      <div className="mt-2">{children}</div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </label>
  );
}

export function LessonCreateDraftForm({
  allowedGradeSlugs,
  allowedGradesBySubject,
  backTo,
  backLabel,
  editTo,
  lockGradeWhenSingle = true,
}: LessonCreateDraftFormProps) {
  const navigate = useNavigate();
  const { lang, dir } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inFlightRef = useRef(false);

  const subjectGradeMap: Record<TeachingSubjectType, string[]> = {
    islamic_education:
      allowedGradesBySubject?.islamic_education ??
      allowedGradeSlugs.map(normalizeGradeSlug),
    quran: allowedGradesBySubject?.quran ?? allowedGradeSlugs.map(normalizeGradeSlug),
  };
  const availableSubjects = TEACHING_SUBJECT_TYPES.filter(
    (subject) => subjectGradeMap[subject].length > 0,
  );

  const [teachingSubject, setTeachingSubject] = useState<TeachingSubjectType>(
    () => availableSubjects[0] ?? DEFAULT_TEACHING_SUBJECT,
  );

  const normalizedAllowed = subjectGradeMap[teachingSubject].map(normalizeGradeSlug);
  const gradeOptions = grades.filter((g) =>
    normalizedAllowed.some((slug) => normalizeGradeSlug(g.slug) === slug),
  );

  const [grade, setGrade] = useState(() => gradeOptions[0]?.slug ?? "");
  const [unit, setUnit] = useState("");
  const [title, setTitle] = useState("");
  const [outcome, setOutcome] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [draftLessonId, setDraftLessonId] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const gradeSlug = normalizeGradeSlug(grade);
  const gradeValid = Boolean(
    gradeSlug && normalizedAllowed.some((g) => normalizeGradeSlug(g) === gradeSlug),
  );
  const subjectValid = availableSubjects.includes(teachingSubject);
  const unitValid = Boolean(unit.trim());
  const titleValid = Boolean(title.trim());
  const outcomeValid = Boolean(outcome.trim());
  const fileValidation = selectedFile ? validateLessonMainFileForCreate(selectedFile) : null;
  const fileValid = Boolean(selectedFile && !fileValidation);
  const formValid = subjectValid && gradeValid && unitValid && titleValid && outcomeValid && fileValid;
  const busy = submitPhase !== "idle";

  const unitError = touched && !unitValid ? L("Unit number is required", "رقم الوحدة مطلوب")[lang] : null;
  const titleError = touched && !titleValid ? L("Lesson name is required", "اسم الدرس مطلوب")[lang] : null;
  const outcomeError =
    touched && !outcomeValid ? L("Learning outcome is required", "نواتج التعلّم مطلوبة")[lang] : null;
  const fileFieldError =
    fileError ??
    (touched && !selectedFile
      ? L("Main lesson file is required", "ملف الدرس الرئيسي مطلوب")[lang]
      : touched && fileValidation
        ? fileValidation[lang]
        : null);

  const pickFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setSelectedFile(null);
        setFileError(null);
        return;
      }
      const validation = validateLessonMainFileForCreate(file);
      if (validation) {
        setSelectedFile(null);
        setFileError(validation[lang]);
        return;
      }
      setSelectedFile(file);
      setFileError(null);
      setUploadError(null);
    },
    [lang],
  );

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    pickFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (busy) return;
    pickFile(e.dataTransfer.files?.[0] ?? null);
  };

  const buildInsertPayload = () => {
    const unitCanonical = unit.trim();
    const titlePayload =
      lang === "ar"
        ? { en: title.trim(), ar: title.trim() }
        : { en: title.trim(), ar: "" };
    const outcomePayload =
      lang === "ar"
        ? { en: outcome.trim(), ar: outcome.trim() }
        : { en: outcome.trim(), ar: "" };

    return {
      grade: gradeSlug,
      title: titlePayload,
      unit: { en: unitCanonical, ar: unitCanonical },
      outcome: outcomePayload,
      explanation: { en: "", ar: "" },
      vocab: serializeVocabForStorage([]),
      quiz: [],
      subject_category: "quran" as const,
      teaching_subject: teachingSubject,
      published: false,
    };
  };

  const onTeachingSubjectChange = (nextSubject: TeachingSubjectType) => {
    setTeachingSubject(nextSubject);
    const nextAllowed = subjectGradeMap[nextSubject].map(normalizeGradeSlug);
    const nextGradeOptions = grades.filter((g) =>
      nextAllowed.some((slug) => normalizeGradeSlug(g.slug) === slug),
    );
    const currentNorm = normalizeGradeSlug(grade);
    if (!nextAllowed.some((slug) => slug === currentNorm)) {
      setGrade(nextGradeOptions[0]?.slug ?? "");
    }
  };

  const uploadSelectedFile = async (lessonId: string, file: File) => {
    const safeLessonId = parseLessonUuid(lessonId);
    if (!safeLessonId) {
      throw new Error(
        L(
          "Draft was created but the lesson ID is invalid. Please continue editing and upload from there.",
          "تم إنشاء المسودة لكن معرّف الدرس غير صالح. يُرجى متابعة التعديل والرفع من هناك.",
        )[lang],
      );
    }
    const slotKey = mainFileSlotForUpload(lang === "ar" ? "ar" : "en", file);
    const column = mainFileDbColumn(slotKey);
    const { publicUrl } = await uploadLessonFile(file, safeLessonId);
    const { error: dbError } = await supabase
      .from("lessons")
      .update({ [column]: publicUrl })
      .eq("id", lessonId);
    if (dbError) {
      throw new Error(
        L("File uploaded but lesson record could not be updated.", "تم رفع الملف لكن تعذّر تحديث سجل الدرس.")[
          lang
        ] + ` ${dbError.message}`,
      );
    }
    return publicUrl;
  };

  const createDraftAndUpload = async () => {
    if (inFlightRef.current) return;
    setTouched(true);
    if (!formValid || !selectedFile) return;

    inFlightRef.current = true;
    setUploadError(null);

    let lessonId = draftLessonId;

    try {
      if (!lessonId) {
        setSubmitPhase("creating");
        const { data, error } = await supabase
          .from("lessons")
          .insert(buildInsertPayload())
          .select("id")
          .single();
        if (error) throw error;
        const createdId = parseLessonUuid(data.id);
        if (!createdId) {
          throw new Error(
            L("Draft was created but returned an invalid lesson ID.", "تم إنشاء المسودة لكن معرّف الدرس المُعاد غير صالح.")[
              lang
            ],
          );
        }
        lessonId = createdId;
        setDraftLessonId(lessonId);
      }

      setSubmitPhase("uploading");
      await uploadSelectedFile(lessonId, selectedFile);

      navigate({
        to: editTo,
        params: { lessonId },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (lessonId) {
        setDraftLessonId(lessonId);
        setUploadError(message);
        toast.error(message);
      } else {
        toast.error(message);
      }
    } finally {
      setSubmitPhase("idle");
      inFlightRef.current = false;
    }
  };

  const primaryLabel =
    submitPhase === "creating"
      ? L("Creating draft…", "جاري إنشاء المسودة…")[lang]
      : submitPhase === "uploading"
        ? L("Uploading file…", "جاري رفع الملف…")[lang]
        : draftLessonId && uploadError
          ? L("Retry upload", "إعادة رفع الملف")[lang]
          : L("Create Lesson Draft", "إنشاء مسودة الدرس")[lang];

  const gradeLocked = lockGradeWhenSingle && gradeOptions.length === 1;

  return (
    <div className="mx-auto w-full max-w-[1050px] space-y-5" dir={dir}>
      <Link
        to={backTo}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <header className="space-y-2">
        <h1 className="font-display text-2xl text-foreground sm:text-3xl">
          {L("Create Lesson", "إنشاء درس")[lang]}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {L(
            "Enter lesson details and select your PDF or PPTX file. We will create the draft and upload the file in one step.",
            "أدخل تفاصيل الدرس واختر ملف PDF أو PPTX. سننشئ المسودة ونرفع الملف في خطوة واحدة.",
          )[lang]}
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-8 lg:p-10">
        <div className="grid gap-6 md:grid-cols-2">
          {availableSubjects.length > 1 || allowedGradesBySubject ? (
            <Field label={L("Subject", "المادة")[lang]} required>
              <select
                className={INPUT_CLASS}
                value={teachingSubject}
                disabled={busy || availableSubjects.length <= 1}
                onChange={(e) => onTeachingSubjectChange(e.target.value as TeachingSubjectType)}
              >
                {availableSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {teachingSubjectLabel(subject, lang)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label={L("Grade", "الصف")[lang]} required>
            <select
              className={INPUT_CLASS}
              value={grade}
              disabled={busy || gradeLocked}
              onChange={(e) => setGrade(e.target.value)}
            >
              {gradeOptions.map((g) => (
                <option key={g.slug} value={g.slug}>
                  {gradeDisplayName(g.slug, lang)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={L("Unit Number", "رقم الوحدة")[lang]} required error={unitError}>
            <input
              className={INPUT_CLASS}
              dir={lang === "ar" ? "rtl" : "ltr"}
              value={unit}
              disabled={busy}
              onChange={(e) => setUnit(e.target.value)}
              onBlur={() => setTouched(true)}
            />
          </Field>
        </div>

        <div className="mt-6">
          <Field label={L("Lesson Name", "اسم الدرس")[lang]} required error={titleError}>
            <input
              className={INPUT_CLASS}
              dir={lang === "ar" ? "rtl" : "ltr"}
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
            />
          </Field>
        </div>

        <div className="mt-6">
          <Field label={L("Learning Outcome", "نواتج التعلّم")[lang]} required error={outcomeError}>
            <textarea
              className={`${INPUT_CLASS} min-h-[140px] resize-y leading-relaxed`}
              dir={lang === "ar" ? "rtl" : "ltr"}
              rows={5}
              value={outcome}
              disabled={busy}
              onChange={(e) => setOutcome(e.target.value)}
              onBlur={() => setTouched(true)}
            />
          </Field>
        </div>

        <div className="mt-6">
          <Field
            label={L("Main Lesson File", "ملف الدرس الرئيسي")[lang]}
            required
            error={fileFieldError}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={CREATE_MAIN_LESSON_FILE_ACCEPT}
              className="sr-only"
              disabled={busy}
              onChange={onFileInputChange}
            />

            <div
              role="button"
              tabIndex={busy ? -1 : 0}
              onKeyDown={(e) => {
                if (busy) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={onDrop}
              className={`rounded-xl border-2 border-dashed p-6 sm:p-8 transition-colors ${
                selectedFile
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/30 hover:bg-muted/30"
              } ${busy ? "pointer-events-none opacity-70" : "cursor-pointer"}`}
              onClick={() => {
                if (!busy) fileInputRef.current?.click();
              }}
            >
              {!selectedFile ? (
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="h-6 w-6" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {L("Choose file", "اختر ملفًا")[lang]}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {L("or drag and drop here", "أو اسحب الملف وأفلته هنا")[lang]}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {L("Accepted: PDF, PPTX · Max 100 MB", "المقبول: PDF و PPTX · بحد أقصى 100 ميجابايت")[lang]}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileUp className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground" title={selectedFile.name}>
                        {selectedFile.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {humanFileSize(selectedFile.size)}
                      </p>
                      <span className="mt-2 inline-flex rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-900 dark:text-amber-100">
                        {L("Selected locally", "محدد محليًا")[lang]}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      pickFile(null);
                    }}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {L("Remove", "إزالة")[lang]}
                  </button>
                </div>
              )}
            </div>
          </Field>
        </div>

        {uploadError ? (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="font-medium">{L("Upload failed", "فشل الرفع")[lang]}</p>
            <p className="mt-1 break-words">{uploadError}</p>
            {draftLessonId ? (
              <p className="mt-2 text-xs text-destructive/90">
                {L(
                  "Your draft was saved. You can retry the upload or continue editing the lesson.",
                  "تم حفظ المسودة. يمكنك إعادة رفع الملف أو متابعة تعديل الدرس.",
                )[lang]}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-end">
          <Link
            to={backTo}
            className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            {L("Cancel", "إلغاء")[lang]}
          </Link>
          {draftLessonId && uploadError ? (
            <Link
              to={editTo}
              params={{ lessonId: draftLessonId }}
              className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              {L("Continue to edit", "متابعة التعديل")[lang]}
            </Link>
          ) : null}
          <button
            type="button"
            disabled={!formValid || busy}
            onClick={() => void createDraftAndUpload()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
