import type { CustomLesson } from "@/lib/cms";

export type BilingualFileKey =
  | "pptArUrl"
  | "pptEnUrl"
  | "worksheetArUrl"
  | "worksheetEnUrl"
  | "pdfArUrl"
  | "pdfEnUrl";

export type BilingualLessonFiles = Record<BilingualFileKey, string | null>;

export type BilingualFileSlot = {
  key: BilingualFileKey;
  labelEn: string;
  labelAr: string;
  accept: string;
  folder: string;
};

export const BILINGUAL_LESSON_FILE_SLOTS: BilingualFileSlot[] = [
  { key: "pptArUrl", labelEn: "PPT Arabic", labelAr: "باوربوينت عربي", accept: ".ppt,.pptx", folder: "ppt-ar" },
  { key: "pptEnUrl", labelEn: "PPT English", labelAr: "باوربوينت إنجليزي", accept: ".ppt,.pptx", folder: "ppt-en" },
  { key: "worksheetArUrl", labelEn: "Worksheet Arabic", labelAr: "ورقة عمل عربية", accept: ".pdf,.doc,.docx", folder: "worksheet-ar" },
  { key: "worksheetEnUrl", labelEn: "Worksheet English", labelAr: "ورقة عمل إنجليزية", accept: ".pdf,.doc,.docx", folder: "worksheet-en" },
  { key: "pdfArUrl", labelEn: "PDF Arabic", labelAr: "PDF عربي", accept: ".pdf", folder: "pdf-ar" },
  { key: "pdfEnUrl", labelEn: "PDF English", labelAr: "PDF إنجليزي", accept: ".pdf", folder: "pdf-en" },
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
  labelEn: string;
  labelAr: string;
};

export function studentDownloadItems(custom: CustomLesson): StudentDownloadItem[] {
  const items: StudentDownloadItem[] = [];
  for (const slot of BILINGUAL_LESSON_FILE_SLOTS) {
    const url = custom[slot.key];
    if (url) {
      items.push({
        url,
        labelEn: `Download ${slot.labelEn}`,
        labelAr: `تحميل ${slot.labelAr}`,
      });
    }
  }
  // Legacy single-file columns (shown only when bilingual URLs are not set)
  const hasBilingualPpt = Boolean(custom.pptArUrl || custom.pptEnUrl);
  const hasBilingualWorksheet = Boolean(custom.worksheetArUrl || custom.worksheetEnUrl);
  const hasBilingualPdf = Boolean(custom.pdfArUrl || custom.pdfEnUrl);
  if (!hasBilingualPpt && custom.pptUrl) {
    items.push({ url: custom.pptUrl, labelEn: "Download PowerPoint", labelAr: "تحميل عرض باوربوينت" });
  }
  if (!hasBilingualWorksheet && custom.worksheetUrl) {
    items.push({ url: custom.worksheetUrl, labelEn: "Download Worksheet", labelAr: "تحميل ورقة العمل" });
  }
  if (!hasBilingualPdf && custom.pdfUrl) {
    items.push({ url: custom.pdfUrl, labelEn: "Download PDF", labelAr: "تحميل ملف PDF" });
  }
  return items;
}
