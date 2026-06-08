import { useState, type ChangeEvent } from "react";
import { Trash2, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { uploadLessonFile, deleteLessonFile, formatError } from "@/lib/upload";
import {
  BILINGUAL_LESSON_FILE_SLOTS,
  type BilingualFileKey,
  type BilingualLessonFiles,
  fileNameFromUrl,
} from "@/lib/lesson-bilingual-files";

const L = (en: string, ar: string) => ({ en, ar });

export function LessonBilingualFileFields({
  files,
  onChange,
  lessonId,
}: {
  files: BilingualLessonFiles;
  onChange: (files: BilingualLessonFiles) => void;
  lessonId?: string;
}) {
  const { lang } = useI18n();
  const [uploading, setUploading] = useState<BilingualFileKey | null>(null);
  const [paths, setPaths] = useState<Partial<Record<BilingualFileKey, string>>>({});

  const setFile = (key: BilingualFileKey, value: string | null, path?: string) => {
    onChange({ ...files, [key]: value });
    if (path) setPaths((p) => ({ ...p, [key]: path }));
    if (value === null) setPaths((p) => {
      const next = { ...p };
      delete next[key];
      return next;
    });
  };

  const onUpload = (key: BilingualFileKey, folder: string) => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(key);
    try {
      toast.message(L("Uploading file…", "جارٍ رفع الملف…")[lang]);
      const prefix = lessonId ? `lessons/${lessonId}` : "lessons/new";
      const up = await uploadLessonFile(file, `${prefix}/${folder}`);
      setFile(key, up.url, up.path);
      toast.success(L("File uploaded", "تم رفع الملف")[lang]);
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setUploading(null);
    }
  };

  const onRemove = async (key: BilingualFileKey) => {
    const storagePath = paths[key];
    if (storagePath) {
      try {
        await deleteLessonFile(storagePath);
      } catch {
        // DB URL will still be cleared; storage cleanup is best-effort
      }
    }
    setFile(key, null);
    toast.success(L("File removed", "تم إزالة الملف")[lang]);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background p-4">
      <h4 className="font-display text-lg text-primary">
        {L("Bilingual Lesson Files", "ملفات الدرس ثنائية اللغة")[lang]}
      </h4>
      <div className="grid gap-4 md:grid-cols-2">
        {BILINGUAL_LESSON_FILE_SLOTS.map((slot) => {
          const url = files[slot.key];
          const name = url ? fileNameFromUrl(url) : null;
          const busy = uploading === slot.key;
          return (
            <div key={slot.key} className="rounded-lg border border-border p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {lang === "ar" ? slot.labelAr : slot.labelEn}
              </div>
              {url ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-emerald truncate max-w-[180px]" title={name ?? undefined}>
                    ✓ {name}
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-emerald"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {L("View", "عرض")[lang]}
                  </a>
                  <button
                    type="button"
                    onClick={() => void onRemove(slot.key)}
                    className="inline-flex items-center gap-1 text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {L("Remove", "إزالة")[lang]}
                  </button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  {L("No file uploaded", "لم يتم رفع ملف")[lang]}
                </div>
              )}
              <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:border-emerald hover:text-emerald">
                <Upload className="h-3.5 w-3.5" />
                {busy
                  ? L("Uploading…", "جارٍ الرفع…")[lang]
                  : url
                    ? L("Replace file", "استبدال الملف")[lang]
                    : L("Upload file", "رفع ملف")[lang]}
                <input
                  type="file"
                  accept={slot.accept}
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => void onUpload(slot.key, slot.folder)(e)}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}