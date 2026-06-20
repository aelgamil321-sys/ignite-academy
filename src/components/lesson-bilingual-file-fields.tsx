import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {useI18n, L } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { deleteLessonFile, formatError, uploadLessonFile, validateLessonUploadFile } from "@/lib/upload";
import {
  BILINGUAL_LESSON_FILE_SLOTS,
  BILINGUAL_FILE_DB_COLUMN,
  bilingualKeyFromDbColumn,
  type BilingualFileDbColumn,
  type BilingualFileKey,
  type BilingualLessonFiles,
  fileNameFromUrl,
} from "@/lib/lesson-bilingual-files";

const UPLOAD_TIMEOUT_MS = 60_000;


type FieldMeta = { name: string; path: string };

function withTimeout<T>(promise: Promise<T>, ms: number, stepLabel: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout after ${ms / 1000}s during: ${stepLabel}`));
    }, ms);
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

function metaFromFiles(files: BilingualLessonFiles): Partial<Record<BilingualFileKey, FieldMeta>> {
  const out: Partial<Record<BilingualFileKey, FieldMeta>> = {};
  for (const slot of BILINGUAL_LESSON_FILE_SLOTS) {
    const url = files[slot.key];
    if (url) out[slot.key] = { name: fileNameFromUrl(url), path: "" };
  }
  return out;
}

export function LessonBilingualFileFields({
  files,
  onChange,
  lessonId,
  savedFiles,
  onEnsureLessonId,
}: {
  files: BilingualLessonFiles;
  onChange: Dispatch<SetStateAction<BilingualLessonFiles>>;
  lessonId?: string;
  /** URLs from the loaded lesson row (baseline / DB snapshot). */
  savedFiles?: BilingualLessonFiles;
  /** Save a new lesson draft and return its ID before the first file upload. */
  onEnsureLessonId?: () => Promise<string | null>;
}) {
  const { lang } = useI18n();
  const lessonIdRef = useRef(lessonId);
  lessonIdRef.current = lessonId;

  const [localFiles, setLocalFiles] = useState<BilingualLessonFiles>(files);
  const [meta, setMeta] = useState<Partial<Record<BilingualFileKey, FieldMeta>>>(() => metaFromFiles(files));
  const [uploading, setUploading] = useState<Partial<Record<BilingualFileKey, boolean>>>({});
  const [ensuringLesson, setEnsuringLesson] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<BilingualFileKey, string>>>({});
  const [successMsg, setSuccessMsg] = useState<Partial<Record<BilingualFileKey, string>>>({});
  const [dbUrls, setDbUrls] = useState<Partial<Record<BilingualFileKey, string | null>>>({});

  const prevLessonId = useRef(lessonId);

  useEffect(() => {
    if (prevLessonId.current !== lessonId) {
      prevLessonId.current = lessonId;
      setLocalFiles(files);
      setMeta(metaFromFiles(files));
      setUploading({});
      setErrors({});
      setSuccessMsg({});
      setDbUrls({});
    }
  }, [lessonId, files]);

  useEffect(() => {
    if (savedFiles) {
      setDbUrls((prev) => {
        const next = { ...prev };
        for (const slot of BILINGUAL_LESSON_FILE_SLOTS) {
          if (savedFiles[slot.key] && !next[slot.key]) {
            next[slot.key] = savedFiles[slot.key];
          }
        }
        return next;
      });
    }
  }, [savedFiles]);

  const handleFileUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    column: BilingualFileDbColumn,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = bilingualKeyFromDbColumn(column);
    if (!key) return;

    let currentLessonId = lessonIdRef.current;
    if (!currentLessonId && onEnsureLessonId) {
      setEnsuringLesson(true);
      try {
        console.log("[upload] ensuring lesson exists before file upload");
        currentLessonId = (await onEnsureLessonId()) ?? undefined;
        lessonIdRef.current = currentLessonId;
      } catch (err) {
        const message = formatError(err);
        setErrors((p) => ({ ...p, [key]: message }));
        toast.error(message);
        return;
      } finally {
        setEnsuringLesson(false);
      }
    }

    if (!currentLessonId) {
      const msg = L(
        "Save the lesson first, then open it to edit and upload files.",
        "احفظ الدرس أولًا، ثم افتحه للتعديل وارفع الملفات.",
      )[lang];
      setErrors((p) => ({ ...p, [key]: msg }));
      toast.error(msg);
      return;
    }

    const validation = validateLessonUploadFile(file);
    if (validation) {
      const msg = validation[lang];
      setErrors((p) => ({ ...p, [key]: msg }));
      toast.error(msg);
      return;
    }

    setUploading((p) => ({ ...p, [key]: true }));
    setErrors((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
    setSuccessMsg((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });

    console.log("[upload] A. File selected", {
      name: file.name,
      size: file.size,
      type: file.type,
      column,
      lessonId: currentLessonId,
    });

    try {
      await withTimeout(
        (async () => {
          console.log("[upload] B. Upload started");
          const { publicUrl, filePath } = await uploadLessonFile(file, currentLessonId);

          console.log("[upload] C. Upload completed", { publicUrl, filePath });

          console.log("[upload] D. Saving URL to lesson row", { column, lessonId: currentLessonId });
          const { error: dbError } = await supabase
            .from("lessons")
            .update({ [column]: publicUrl })
            .eq("id", currentLessonId);

          if (dbError) {
            toast.error(`File uploaded but lesson URL save failed: ${dbError.message}`);
            throw new Error(`lesson URL save failed: ${dbError.message}`);
          }

          const { data: verifyRow, error: verifyError } = await supabase
            .from("lessons")
            .select(column)
            .eq("id", currentLessonId)
            .single();

          const savedUrl = verifyRow ? String((verifyRow as Record<string, unknown>)[column] ?? "") : "";
          console.log("[upload] E. Verified DB row", { savedUrl, verifyError });

          setDbUrls((p) => ({ ...p, [key]: savedUrl || publicUrl }));

          console.log("[upload] F. Updating local UI state");
          setLocalFiles((prev) => ({ ...prev, [key]: publicUrl }));
          setMeta((prev) => ({ ...prev, [key]: { name: file.name, path: filePath } }));
          onChange((prev) => ({ ...prev, [key]: publicUrl }));

          const success = L("File uploaded and saved successfully", "تم رفع الملف وحفظه بنجاح")[lang];
          setSuccessMsg((p) => ({ ...p, [key]: success }));
          toast.success(success);
        })(),
        UPLOAD_TIMEOUT_MS,
        "upload",
      );
    } catch (err) {
      console.error("[upload] error", err);
      const raw = formatError(err);
      const message = raw.includes("lesson URL save failed")
        ? `File uploaded but lesson URL save failed: ${raw.replace(/^lesson URL save failed: /, "")}`
        : raw.startsWith("Storage upload failed:")
          ? raw
          : raw.includes("Timeout")
            ? raw
            : `Upload failed: ${raw}`;
      setErrors((p) => ({ ...p, [key]: message }));
      if (!message.includes("lesson URL save failed")) {
        toast.error(message);
      }
    } finally {
      setUploading((p) => ({ ...p, [key]: false }));
      e.target.value = "";
    }
  };

  const onRemove = async (key: BilingualFileKey) => {
    const storagePath = meta[key]?.path;
    if (storagePath) {
      try {
        await deleteLessonFile(storagePath);
      } catch (removeErr) {
        console.error("[lesson upload] remove storage error:", removeErr);
      }
    }

    setLocalFiles((prev) => ({ ...prev, [key]: null }));
    setMeta((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setDbUrls((prev) => ({ ...prev, [key]: null }));
    setSuccessMsg((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    onChange((prev) => ({ ...prev, [key]: null }));

    if (lessonId) {
      try {
        const column = BILINGUAL_FILE_DB_COLUMN[key];
        await supabase.from("lessons").update({ [column]: null }).eq("id", lessonId);
      } catch (err) {
        console.error("[lesson upload] remove db error:", err);
        toast.error(formatError(err));
        return;
      }
    }

    toast.success(L("File removed", "تم إزالة الملف")[lang]);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background p-4">
      <h4 className="font-display text-lg text-foreground">
        {L("Bilingual Lesson Files", "ملفات الدرس ثنائية اللغة")[lang]}
      </h4>
      {ensuringLesson && (
        <p className="text-xs font-medium text-primary">
          {L("Saving lesson draft before upload…", "جارٍ حفظ مسودة الدرس قبل الرفع…")[lang]}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {BILINGUAL_LESSON_FILE_SLOTS.map((slot) => {
          const column = BILINGUAL_FILE_DB_COLUMN[slot.key] as BilingualFileDbColumn;
          const localUrl = localFiles[slot.key];
          const fileName = meta[slot.key]?.name ?? (localUrl ? fileNameFromUrl(localUrl) : null);
          const busy = uploading[slot.key] || ensuringLesson;

          return (
            <div key={slot.key} className="rounded-lg border border-border p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {lang === "ar" ? slot.labelAr : slot.labelEn}
              </div>

              <input
                type="file"
                accept={slot.accept}
                disabled={busy}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:border-primary"
                onChange={(e) => {
                  void handleFileUpload(e, column);
                }}
              />

              {busy && (
                <div className="text-xs font-medium text-primary">Uploading to Supabase…</div>
              )}
              {successMsg[slot.key] && !busy && (
                <div className="text-xs font-medium text-primary">{successMsg[slot.key]}</div>
              )}
              {errors[slot.key] && !busy && (
                <div className="text-xs font-medium text-destructive break-all">{errors[slot.key]}</div>
              )}
              {!busy && !localUrl && !errors[slot.key] && !successMsg[slot.key] && (
                <div className="text-xs text-muted-foreground italic">
                  {L("No file uploaded", "لم يتم رفع ملف")[lang]}
                </div>
              )}

              {localUrl && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="text-primary truncate max-w-[180px]" title={fileName ?? undefined}>
                    ✓ {fileName}
                  </span>
                  <a
                    href={localUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {L("View", "عرض")[lang]}
                  </a>
                  <button
                    type="button"
                    onClick={() => void onRemove(slot.key)}
                    disabled={busy}
                    className="inline-flex items-center gap-1 text-destructive hover:text-destructive/80 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {L("Remove", "إزالة")[lang]}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
