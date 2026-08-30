import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n, L } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { deleteLessonFile, formatError, uploadLessonFile } from "@/lib/upload";
import type { CustomLesson } from "@/lib/cms";
import {
  type BilingualLessonFiles,
  fileNameFromUrl,
} from "@/lib/lesson-bilingual-files";
import {
  mainFileDbColumn,
  mainFileSlotForUpload,
  resolveMainLessonFile,
  validateLessonMainFileUpload,
  MAIN_LESSON_FILE_ACCEPT,
  type MainLessonFileRef,
} from "@/lib/lesson-main-file";

const UPLOAD_TIMEOUT_MS = 60_000;

function withTimeout<T>(promise: Promise<T>, ms: number, stepLabel: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout after ${ms / 1000}s during: ${stepLabel}`)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function LessonMainFileField({
  files,
  onChange,
  lessonId,
  lesson,
}: {
  files: BilingualLessonFiles;
  onChange: Dispatch<SetStateAction<BilingualLessonFiles>>;
  lessonId: string;
  lesson: CustomLesson;
}) {
  const { lang } = useI18n();
  const lessonIdRef = useRef(lessonId);
  lessonIdRef.current = lessonId;

  const [mainRef, setMainRef] = useState<MainLessonFileRef | null>(() =>
    resolveMainLessonFile(files, lesson, lang),
  );
  const [storagePath, setStoragePath] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMainRef(resolveMainLessonFile(files, lesson, lang));
  }, [files, lesson, lang]);

  const uploadMainFile = async (file: File) => {
    const currentLessonId = lessonIdRef.current;
    if (!currentLessonId) return;

    const validation = validateLessonMainFileUpload(file);
    if (validation) {
      const msg = validation[lang];
      setError(msg);
      toast.error(msg);
      return;
    }

    const slotKey = mainFileSlotForUpload(lang, file);
    const column = mainFileDbColumn(slotKey);

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await withTimeout(
        (async () => {
          const { publicUrl, filePath } = await uploadLessonFile(file, currentLessonId);

          const { error: dbError } = await supabase
            .from("lessons")
            .update({ [column]: publicUrl })
            .eq("id", currentLessonId);

          if (dbError) {
            throw new Error(`lesson URL save failed: ${dbError.message}`);
          }

          onChange((prev) => ({ ...prev, [slotKey]: publicUrl }));
          setStoragePath(filePath);
          setMainRef({
            kind: "bilingual",
            key: slotKey,
            url: publicUrl,
            fileName: file.name,
          });

          const success = L("File uploaded and saved successfully", "تم رفع الملف وحفظه بنجاح")[lang];
          setSuccessMsg(success);
          toast.success(success);
        })(),
        UPLOAD_TIMEOUT_MS,
        "upload",
      );
    } catch (err) {
      console.error("[lesson main file] upload error", err);
      const message = formatError(err);
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadMainFile(file);
    e.target.value = "";
  };

  const onRemove = async () => {
    if (!mainRef) return;

    if (storagePath) {
      try {
        await deleteLessonFile(storagePath);
      } catch (removeErr) {
        console.error("[lesson main file] remove storage error:", removeErr);
      }
    }

    if (mainRef.kind === "bilingual") {
      onChange((prev) => ({ ...prev, [mainRef.key]: null }));
      if (lessonId) {
        try {
          const column = mainFileDbColumn(mainRef.key);
          await supabase.from("lessons").update({ [column]: null }).eq("id", lessonId);
        } catch (err) {
          console.error("[lesson main file] remove db error:", err);
          toast.error(formatError(err));
          return;
        }
      }
    } else if (mainRef.kind === "legacy-ppt" && lessonId) {
      await supabase.from("lessons").update({ ppt_url: null, ppt_name: null }).eq("id", lessonId);
    } else if (mainRef.kind === "legacy-pdf" && lessonId) {
      await supabase.from("lessons").update({ pdf_url: null, pdf_name: null }).eq("id", lessonId);
    }

    setMainRef(null);
    setStoragePath("");
    setSuccessMsg(null);
    setError(null);
    toast.success(L("File removed", "تم إزالة الملف")[lang]);
  };

  const displayName = mainRef?.fileName ?? null;
  const displayUrl = mainRef?.url ?? null;

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {L("Main Lesson File", "ملف الدرس الرئيسي")[lang]}
        <span className="text-destructive ms-1">*</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {L("Accepted formats: PDF, PPT, PPTX", "الصيغ المقبولة: PDF و PPT و PPTX")[lang]}
      </p>

      <input
        type="file"
        accept={MAIN_LESSON_FILE_ACCEPT}
        disabled={uploading}
        className="block w-full text-sm file:me-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:border-primary"
        onChange={(e) => {
          void handleFileUpload(e);
        }}
      />

      {uploading && (
        <div className="text-xs font-medium text-primary">
          {L("Uploading…", "جارٍ الرفع…")[lang]}
        </div>
      )}
      {successMsg && !uploading && (
        <div className="text-xs font-medium text-primary">{successMsg}</div>
      )}
      {error && !uploading && (
        <div className="text-xs font-medium text-destructive break-all">{error}</div>
      )}
      {!uploading && !displayUrl && !error && !successMsg && (
        <div className="text-xs text-muted-foreground italic">
          {L("No file uploaded", "لم يتم رفع ملف")[lang]}
        </div>
      )}

      {displayUrl && (
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
          <span className="text-primary truncate max-w-[220px]" title={displayName ?? undefined}>
            ✓ {displayName ?? fileNameFromUrl(displayUrl)}
          </span>
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {L("View", "عرض")[lang]}
          </a>
          <button
            type="button"
            onClick={() => void onRemove()}
            disabled={uploading}
            className="inline-flex items-center gap-1 text-destructive hover:text-destructive/80 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {L("Remove", "إزالة")[lang]}
          </button>
        </div>
      )}
    </div>
  );
}
