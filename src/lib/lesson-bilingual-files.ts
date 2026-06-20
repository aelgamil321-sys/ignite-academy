import type { CustomLesson } from "@/lib/cms";

export type BilingualFileKey =
  | "pptArUrl"
  | "pptEnUrl"
  | "worksheetArUrl"
  | "worksheetEnUrl"
  | "pdfArUrl"
  | "pdfEnUrl";

/** Maps CMS field keys to Supabase `lessons` table columns. */
export const BILINGUAL_FILE_DB_COLUMN: Record<BilingualFileKey, string> = {
  pptArUrl: "ppt_ar_url",
  pptEnUrl: "ppt_en_url",
  worksheetArUrl: "worksheet_ar_url",
  worksheetEnUrl: "worksheet_en_url",
  pdfArUrl: "pdf_ar_url",
  pdfEnUrl: "pdf_en_url",
};

export type BilingualFileDbColumn = (typeof BILINGUAL_FILE_DB_COLUMN)[BilingualFileKey];

export function bilingualKeyFromDbColumn(column: BilingualFileDbColumn): BilingualFileKey | null {
  const entry = Object.entries(BILINGUAL_FILE_DB_COLUMN).find(([, dbColumn]) => dbColumn === column);
  return entry ? (entry[0] as BilingualFileKey) : null;
}

export type BilingualLessonFiles = Record<BilingualFileKey, string | null>;

export type BilingualFileSlot = {
  key: BilingualFileKey;
  labelEn: string;
  labelAr: string;
  accept: string;
  folder: string;
};

export const BILINGUAL_LESSON_FILE_SLOTS: BilingualFileSlot[] = [
  {
    key: "pptArUrl",
    labelEn: "PPT Arabic",
    labelAr: "باوربوينت عربي",
    accept: ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    folder: "ppt-ar",
  },
  {
    key: "pptEnUrl",
    labelEn: "PPT English",
    labelAr: "باوربوينت إنجليزي",
    accept: ".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    folder: "ppt-en",
  },
  {
    key: "worksheetArUrl",
    labelEn: "Worksheet Arabic",
    labelAr: "ورقة عمل عربية",
    accept: ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    folder: "worksheet-ar",
  },
  {
    key: "worksheetEnUrl",
    labelEn: "Worksheet English",
    labelAr: "ورقة عمل إنجليزية",
    accept: ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    folder: "worksheet-en",
  },
  { key: "pdfArUrl", labelEn: "PDF Arabic", labelAr: "PDF عربي", accept: ".pdf,application/pdf", folder: "pdf-ar" },
  { key: "pdfEnUrl", labelEn: "PDF English", labelAr: "PDF إنجليزي", accept: ".pdf,application/pdf", folder: "pdf-en" },
];

export const EMPTY_BILINGUAL_LESSON_FILES: BilingualLessonFiles = {
  pptArUrl: null,
  pptEnUrl: null,
  worksheetArUrl: null,
  worksheetEnUrl: null,
  pdfArUrl: null,
  pdfEnUrl: null,
};

export function bilingualFilesFromLesson(lesson: CustomLesson): BilingualLessonFiles {
  return {
    pptArUrl: lesson.pptArUrl ?? null,
    pptEnUrl: lesson.pptEnUrl ?? null,
    worksheetArUrl: lesson.worksheetArUrl ?? null,
    worksheetEnUrl: lesson.worksheetEnUrl ?? null,
    pdfArUrl: lesson.pdfArUrl ?? null,
    pdfEnUrl: lesson.pdfEnUrl ?? null,
  };
}

export function bilingualFilesToLessonPartial(files: BilingualLessonFiles): Partial<CustomLesson> {
  return {
    pptArUrl: files.pptArUrl ?? undefined,
    pptEnUrl: files.pptEnUrl ?? undefined,
    worksheetArUrl: files.worksheetArUrl ?? undefined,
    worksheetEnUrl: files.worksheetEnUrl ?? undefined,
    pdfArUrl: files.pdfArUrl ?? undefined,
    pdfEnUrl: files.pdfEnUrl ?? undefined,
  };
}

/** Preserves nulls so removed files clear the DB on update. */
export function bilingualFilesToLessonUpdate(files: BilingualLessonFiles) {
  return {
    pptArUrl: files.pptArUrl,
    pptEnUrl: files.pptEnUrl,
    worksheetArUrl: files.worksheetArUrl,
    worksheetEnUrl: files.worksheetEnUrl,
    pdfArUrl: files.pdfArUrl,
    pdfEnUrl: files.pdfEnUrl,
  };
}

/** Merge local uploads over lesson baseline — local non-null wins. */
export function mergeBilingualFiles(
  local: BilingualLessonFiles,
  baseline: BilingualLessonFiles,
): BilingualLessonFiles {
  const out = { ...baseline };
  for (const slot of BILINGUAL_LESSON_FILE_SLOTS) {
    if (local[slot.key]) out[slot.key] = local[slot.key];
  }
  return out;
}

/**
 * Save payload: only sends file URL fields that have a value, or explicit null
 * when the user removed a file that previously existed. Omits untouched empty fields
 * so Save Changes does not wipe URLs already in the database.
 */
export function bilingualFilesSavePayload(
  local: BilingualLessonFiles,
  baseline: BilingualLessonFiles,
): Partial<CustomLesson> {
  const out: Partial<CustomLesson> = {};
  for (const slot of BILINGUAL_LESSON_FILE_SLOTS) {
    const key = slot.key;
    const localVal = local[key];
    const baseVal = baseline[key];
    if (localVal) {
      out[key] = localVal;
    } else if (localVal === null && baseVal) {
      out[key] = null;
    }
  }
  return out;
}

export function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const segment = path.split("/").pop() ?? "file";
    return decodeURIComponent(segment.replace(/^\d+-[a-z0-9]+-/, ""));
  } catch {
    return "file";
  }
}

export type StudentDownloadItem = {
  url: string;
  label: string;
  key: BilingualFileKey;
};

/** Fixed student-facing download buttons for the six bilingual lesson file columns. */
export const STUDENT_LESSON_FILE_DOWNLOADS: Array<{ key: BilingualFileKey; label: string }> = [
  { key: "pptArUrl", label: "تحميل بوربوينت عربي" },
  { key: "pptEnUrl", label: "Download English PowerPoint" },
  { key: "worksheetArUrl", label: "تحميل ورقة عمل عربية" },
  { key: "worksheetEnUrl", label: "Download English Worksheet" },
  { key: "pdfArUrl", label: "تحميل PDF عربي" },
  { key: "pdfEnUrl", label: "Download English PDF" },
];

export function studentDownloadItems(custom: CustomLesson): StudentDownloadItem[] {
  return STUDENT_LESSON_FILE_DOWNLOADS.flatMap((entry) => {
    const url = custom[entry.key]?.trim();
    if (!url) return [];
    return [{ key: entry.key, url, label: entry.label }];
  });
}
