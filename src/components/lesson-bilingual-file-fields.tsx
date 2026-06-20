import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useI18n, L } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { deleteLessonFile, formatError, uploadLessonFile, validateLessonUploadFile } from "@/lib/upload";
import {
  BILINGUAL_LESSON_FILE_SLOTS,
  BILINGUAL_FILE_DB_COLUMN,
  bilingualKeyFromDbColumn,
  type BilingualFileDbColumn,
  type BilingualFileKey,
  type BilingualLessonFiles,
  type BilingualLessonPendingFiles,
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
  deferUpload = false,
  pendingFiles,
  onPendingFilesChange,
}: {
  files: BilingualLessonFiles;
  onChange: Dispatch<SetStateAction<BilingualLessonFiles>>;
  lessonId?: string;
  savedFiles?: BilingualLessonFiles;
  /** Queue files locally until the lesson row is created on Save/Publish. */
  deferUpload?: boolean;
  pendingFiles?: BilingualLessonPendingFiles;
  onPendingFilesChange?: Dispatch<SetStateAction<BilingualLessonPendingFiles>>;
}) {
  const { lang } = useI18n();
  const lessonIdRef = useRef(lessonId);
  lessonIdRef.current = lessonId;

  const [localFiles, setLocalFiles] = useState<BilingualLessonFiles>(files);
  const [meta, setMeta] = useState<Partial<Record<BilingualFileKey, FieldMeta>>>(() => metaFromFiles(files));
  const [uploading, setUploading] = useState<Partial<Record<BilingualFileKey, boolean>>>({});
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
    if (!deferUpload) {
      setLocalFiles(files);
    }
  }, [deferUpload, files]);

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

  const queuePendingFile = (key: BilingualFileKey, file: File) => {
    const validation = validateLessonUploadFile(file);
    if (validation) {
      const msg = validation[lang];
      setErrors((p) => ({ ...p, [key]: msg }));
      toast.error(msg);
      return;
    }

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
    onPendingFilesChange?.((prev) => {
      const next = { ...prev, [key]: file };
      console.log("[lesson upload] queued pending file", { key, name: file.name, size: file.size });
      return next;
    });
    const queued = L("File selected — will upload when you save the lesson", "تم اختيار الملف — سيتم رفعه عند حفظ الدرس")[lang];
    setSuccessMsg((p) => ({ ...p, [key]: queued }));
  };

  const uploadToLesson = async (key: BilingualFileKey, column: BilingualFileDbColumn, file: File) => {
    const currentLessonId = lessonIdRef.current;
    if (!currentLessonId) return;

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

    try {
      await withTimeout(
        (async () => {
          const { publicUrl, filePath } = await uploadLessonFile(file, currentLessonId);

          const { error: dbError } = await supabase
            .from("lessons")
            .update({ [column]: publicUrl })
            .eq("id", currentLessonId);

          if (dbError) {
            toast.error(`File uploaded but lesson URL save failed: ${dbError.message}`);
            throw new Error(`lesson URL save failed: ${dbError.message}`);
          }

          setDbUrls((p) => ({ ...p, [key]: publicUrl }));
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
        : raw.includes("Timeout")
          ? raw
          : raw.startsWith("Upload failed:")
            ? raw
            : `Upload failed: ${raw}`;
      setErrors((p) => ({ ...p, [key]: message }));
      if (!message.includes("lesson URL save failed")) {
        toast.error(message);
      }
    } finally {
      setUploading((p) => ({ ...p, [key]: false }));
    }
  };

  const handleFileUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    column: BilingualFileDbColumn,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const key = bilingualKeyFromDbColumn(column);
    if (!key) return;

    if (deferUpload) {
      queuePendingFile(key, file);
      e.target.value = "";
      return;
    }

    const validation = validateLessonUploadFile(file);
    if (validation) {
      const msg = validation[lang];
      setErrors((p) => ({ ...p, [key]: msg }));
      toast.error(msg);
      e.target.value = "";
      return;
    }

    if (!lessonIdRef.current) {
      const msg = L("Lesson ID is missing. Save the lesson and try again.", "معرّف الدرس مفقود. احفظ الدرس وحاول مرة أخرى.")[lang];
      setErrors((p) => ({ ...p, [key]: msg }));
      toast.error(msg);
      e.target.value = "";
      return;
    }

    await uploadToLesson(key, column, file);
    e.target.value = "";
  };

  const onRemove = async (key: BilingualFileKey) => {
    if (deferUpload && pendingFiles?.[key]) {
      onPendingFilesChange?.((prev) => ({ ...prev, [key]: null }));
      setSuccessMsg((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }

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
      {deferUpload && (
        <p className="text-xs text-muted-foreground">
          {L(
            "Select files now. They will upload automatically when you click Save or Publish.",
            "اختر الملفات الآن. سيتم رفعها تلقائيًا عند الضغط على حفظ أو نشر.",
          )[lang]}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {BILINGUAL_LESSON_FILE_SLOTS.map((slot) => {
          const column = BILINGUAL_FILE_DB_COLUMN[slot.key] as BilingualFileDbColumn;
          const pendingFile = deferUpload ? pendingFiles?.[slot.key] ?? null : null;
          const localUrl = deferUpload ? files[slot.key] : localFiles[slot.key];
          const fileName =
            pendingFile?.name ??
            meta[slot.key]?.name ??
            (localUrl ? fileNameFromUrl(localUrl) : null);
          const busy = uploading[slot.key];
          const hasFile = Boolean(pendingFile || localUrl);

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
                <div className="text-xs font-medium text-primary">
                  {L("Uploading…", "جارٍ الرفع…")[lang]}
                </div>
              )}
              {successMsg[slot.key] && !busy && (
                <div className="text-xs font-medium text-primary">{successMsg[slot.key]}</div>
              )}
              {errors[slot.key] && !busy && (
                <div className="text-xs font-medium text-destructive break-all">{errors[slot.key]}</div>
              )}
              {!busy && !hasFile && !errors[slot.key] && !successMsg[slot.key] && (
                <div className="text-xs text-muted-foreground italic">
                  {L("No file uploaded", "لم يتم رفع ملف")[lang]}
                </div>
              )}

              {hasFile && (
                <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                  <span className="text-primary truncate max-w-[180px]" title={fileName ?? undefined}>
                    ✓ {fileName}
                  </span>
                  {pendingFile && (
                    <span className="text-muted-foreground">
                      ({L("pending", "بانتظار الحفظ")[lang]})
                    </span>
                  )}
                  {localUrl && !pendingFile && (
                    <a
                      href={localUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {L("View", "عرض")[lang]}
                    </a>
                  )}
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
