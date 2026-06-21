import { useMemo } from "react";
import type { Bi } from "@/lib/curriculum";
import { grades } from "@/lib/curriculum";
import {
  BILINGUAL_LESSON_FILE_SLOTS,
  fileNameFromUrl,
  type BilingualFileKey,
} from "@/lib/lesson-bilingual-files";
import { useCMS, ytId } from "@/lib/cms";
import type { CustomLesson, FileType } from "@/lib/cms";
import { gradeDisplayName, gradeMatches } from "@/lib/grade-utils";
import { L, pickBiLocale, type ContentLocale } from "@/lib/i18n-config";

export type LessonResourceType = "pdf" | "ppt" | "worksheet";

export type LessonResourceItem = {
  id: string;
  lessonId: string;
  lessonTitle: Bi;
  gradeSlug: string;
  unit: Bi;
  type: LessonResourceType;
  label: string;
  url: string;
  fileName: string;
};

export type LessonVideoLink = {
  lang: "ar" | "en" | "legacy";
  labelKey: "video_watch_ar" | "video_watch_en" | "video_watch_lesson";
  youtubeUrl: string;
  youtubeId: string;
};

export type LessonVideoItem = {
  lessonId: string;
  title: Bi;
  gradeSlug: string;
  unit: Bi;
  videos: LessonVideoLink[];
};

const BILINGUAL_RESOURCE_TYPE: Record<BilingualFileKey, LessonResourceType> = {
  pdfArUrl: "pdf",
  pdfEnUrl: "pdf",
  pptArUrl: "ppt",
  pptEnUrl: "ppt",
  worksheetArUrl: "worksheet",
  worksheetEnUrl: "worksheet",
};

function bilingualLabel(slot: (typeof BILINGUAL_LESSON_FILE_SLOTS)[number], lang: ContentLocale): string {
  return L(slot.labelEn, slot.labelAr)[lang];
}

function legacyResource(
  lesson: CustomLesson,
  type: LessonResourceType,
  url: string | undefined,
  name: string | undefined,
  label: string,
): LessonResourceItem | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  return {
    id: `${lesson.id}-legacy-${type}`,
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    gradeSlug: lesson.grade,
    unit: lesson.unit,
    type,
    label,
    url: trimmed,
    fileName: name?.trim() || fileNameFromUrl(trimmed),
  };
}

function resourcesFromLesson(lesson: CustomLesson, lang: ContentLocale): LessonResourceItem[] {
  const items: LessonResourceItem[] = [];

  for (const slot of BILINGUAL_LESSON_FILE_SLOTS) {
    const url = lesson[slot.key]?.trim();
    if (!url) continue;
    items.push({
      id: `${lesson.id}-${slot.key}`,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      gradeSlug: lesson.grade,
      unit: lesson.unit,
      type: BILINGUAL_RESOURCE_TYPE[slot.key],
      label: bilingualLabel(slot, lang),
      url,
      fileName: fileNameFromUrl(url),
    });
  }

  const legacyItems = [
    legacyResource(lesson, "pdf", lesson.pdfUrl, lesson.pdfName, "PDF"),
    legacyResource(lesson, "ppt", lesson.pptUrl, lesson.pptName, L("PowerPoint", "باوربوينت")[lang]),
    legacyResource(
      lesson,
      "worksheet",
      lesson.worksheetUrl,
      lesson.worksheetName,
      L("Worksheet", "ورقة عمل")[lang],
    ),
  ].filter((item): item is LessonResourceItem => item !== null);

  return [...items, ...legacyItems];
}

function fileTypeToResourceType(type: FileType): LessonResourceType {
  if (type === "ppt") return "ppt";
  if (type === "worksheet") return "worksheet";
  return "pdf";
}

/** All downloadable lesson resources from CMS lessons + linked files table rows. */
export function useLessonLibraryResources(lang: ContentLocale = "en"): LessonResourceItem[] {
  const { lessons, files } = useCMS();

  return useMemo(() => {
    const published = lessons.filter((l) => l.published);
    const lessonById = new Map(published.map((l) => [l.id, l]));
    const seen = new Set<string>();
    const items: LessonResourceItem[] = [];

    for (const lesson of published) {
      for (const item of resourcesFromLesson(lesson, lang)) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        items.push(item);
      }
    }

    for (const f of files.filter((file) => file.published && file.fileUrl?.trim())) {
      if (seen.has(f.fileUrl)) continue;
      seen.add(f.fileUrl);
      const linked = lessonById.get(f.lesson);
      items.push({
        id: `file-${f.id}`,
        lessonId: f.lesson,
        lessonTitle: linked?.title ?? f.title,
        gradeSlug: f.grade,
        unit: f.unit,
        type: fileTypeToResourceType(f.type),
        label: pickBiLocale(f.title, lang),
        url: f.fileUrl,
        fileName: f.fileName || fileNameFromUrl(f.fileUrl),
      });
    }

    return items.sort((a, b) => {
      const gradeOrder =
        grades.findIndex((g) => gradeMatches(g.slug, a.gradeSlug)) -
        grades.findIndex((g) => gradeMatches(g.slug, b.gradeSlug));
      if (gradeOrder !== 0) return gradeOrder;
      const titleA = a.lessonTitle.en || a.lessonTitle.ar;
      const titleB = b.lessonTitle.en || b.lessonTitle.ar;
      return titleA.localeCompare(titleB);
    });
  }, [lessons, files, lang]);
}

export function lessonVideoLinks(lesson: CustomLesson): LessonVideoLink[] {
  const arId = ytId(lesson.youtubeArUrl ?? "");
  const enId = ytId(lesson.youtubeEnUrl ?? "");
  const legacyId = ytId(lesson.youtubeUrl ?? "");
  const links: LessonVideoLink[] = [];

  if (arId && lesson.youtubeArUrl?.trim()) {
    links.push({
      lang: "ar",
      labelKey: "video_watch_ar",
      youtubeUrl: lesson.youtubeArUrl.trim(),
      youtubeId: arId,
    });
  }
  if (enId && lesson.youtubeEnUrl?.trim()) {
    links.push({
      lang: "en",
      labelKey: "video_watch_en",
      youtubeUrl: lesson.youtubeEnUrl.trim(),
      youtubeId: enId,
    });
  }
  if (!arId && !enId && legacyId && lesson.youtubeUrl?.trim()) {
    links.push({
      lang: "legacy",
      labelKey: "video_watch_lesson",
      youtubeUrl: lesson.youtubeUrl.trim(),
      youtubeId: legacyId,
    });
  }

  return links;
}

/** Published lessons that have at least one video URL. */
export function useLessonVideoItems(): LessonVideoItem[] {
  const { lessons } = useCMS();

  return useMemo(
    () =>
      lessons
        .filter((l) => l.published)
        .map((lesson) => ({
          lessonId: lesson.id,
          title: lesson.title,
          gradeSlug: lesson.grade,
          unit: lesson.unit,
          videos: lessonVideoLinks(lesson),
        }))
        .filter((item) => item.videos.length > 0)
        .sort((a, b) => {
          const gradeOrder =
            grades.findIndex((g) => gradeMatches(g.slug, a.gradeSlug)) -
            grades.findIndex((g) => gradeMatches(g.slug, b.gradeSlug));
          if (gradeOrder !== 0) return gradeOrder;
          const titleA = a.title.en || a.title.ar;
          const titleB = b.title.en || b.title.ar;
          return titleA.localeCompare(titleB);
        }),
    [lessons],
  );
}

export function groupLessonVideosByGrade(
  items: LessonVideoItem[],
): Array<{ gradeSlug: string; gradeName: Bi; lessons: LessonVideoItem[] }> {
  const map = new Map<string, LessonVideoItem[]>();
  for (const item of items) {
    const list = map.get(item.gradeSlug) ?? [];
    list.push(item);
    map.set(item.gradeSlug, list);
  }

  return grades
    .filter((g) => map.has(g.slug))
    .map((g) => ({
      gradeSlug: g.slug,
      gradeName: g.name,
      lessons: map.get(g.slug) ?? [],
    }));
}

export function uniqueLessonsForResources(
  items: LessonResourceItem[],
): Array<{ id: string; title: Bi }> {
  const map = new Map<string, Bi>();
  for (const item of items) {
    if (!map.has(item.lessonId)) map.set(item.lessonId, item.lessonTitle);
  }
  return Array.from(map.entries())
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => (a.title.en || a.title.ar).localeCompare(b.title.en || b.title.ar));
}
