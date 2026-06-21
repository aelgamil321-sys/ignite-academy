import { serializeQuizForSave } from "@/lib/lesson-quiz";
import { extractYoutubeVideoId } from "@/lib/youtube-url";
import type { QuizQuestion } from "@/lib/curriculum";

function hasNonEmptyUrl(url?: string | null): boolean {
  return Boolean(url?.trim());
}

/** Matches Supabase `lessons` media columns (camelCase in CMS). */
export type LessonStatsSource = {
  published: boolean;
  youtubeUrl?: string;
  youtubeArUrl?: string;
  youtubeEnUrl?: string;
  worksheetUrl?: string;
  worksheetArUrl?: string;
  worksheetEnUrl?: string;
  pdfUrl?: string;
  pdfArUrl?: string;
  pdfEnUrl?: string;
  pptUrl?: string;
  pptArUrl?: string;
  pptEnUrl?: string;
  quiz: QuizQuestion[];
};

const VIDEO_URL_FIELDS: Array<keyof LessonStatsSource> = [
  "youtubeArUrl",
  "youtubeEnUrl",
  "youtubeUrl",
];

const EDUCATIONAL_FILE_FIELDS: Array<keyof LessonStatsSource> = [
  "worksheetArUrl",
  "worksheetEnUrl",
  "worksheetUrl",
  "pdfArUrl",
  "pdfEnUrl",
  "pdfUrl",
  "pptArUrl",
  "pptEnUrl",
  "pptUrl",
];

/** Unique YouTube video ids on one lesson (AR/EN/legacy deduped). */
export function collectLessonYoutubeIds(lesson: LessonStatsSource): string[] {
  const ids = new Set<string>();
  for (const key of VIDEO_URL_FIELDS) {
    const value = lesson[key];
    if (typeof value !== "string") continue;
    const id = extractYoutubeVideoId(value);
    if (id) ids.add(id);
  }
  return [...ids];
}

/** Unique YouTube video ids across all published lessons. */
export function countUniqueYoutubeIds(lessons: LessonStatsSource[]): number {
  const ids = new Set<string>();
  for (const lesson of lessons.filter((l) => l.published)) {
    for (const id of collectLessonYoutubeIds(lesson)) {
      ids.add(id);
    }
  }
  return ids.size;
}

/** Count all uploaded educational files (worksheets, PDFs, PowerPoints). */
export function countLessonEducationalFiles(lesson: LessonStatsSource): number {
  return EDUCATIONAL_FILE_FIELDS.reduce((sum, key) => {
    const value = lesson[key];
    return sum + (typeof value === "string" && hasNonEmptyUrl(value) ? 1 : 0);
  }, 0);
}

/** List non-empty educational file URLs on a lesson. */
export function collectLessonEducationalFileUrls(lesson: LessonStatsSource): string[] {
  return EDUCATIONAL_FILE_FIELDS.flatMap((key) => {
    const value = lesson[key];
    return typeof value === "string" && hasNonEmptyUrl(value) ? [value.trim()] : [];
  });
}

/** Lesson has a saved quiz (at least one question with text). */
export function lessonHasQuiz(lesson: LessonStatsSource): boolean {
  return serializeQuizForSave(lesson.quiz).length > 0;
}

export type HomepageStats = {
  lessonCount: number;
  videoCount: number;
  educationalFileCount: number;
  quizCount: number;
};

/** Aggregate homepage statistics from published lessons. */
export function computeHomepageStats(lessons: LessonStatsSource[]): HomepageStats {
  const published = lessons.filter((l) => l.published);

  return {
    lessonCount: published.length,
    videoCount: countUniqueYoutubeIds(published),
    educationalFileCount: published.reduce((sum, l) => sum + countLessonEducationalFiles(l), 0),
    quizCount: published.filter(lessonHasQuiz).length,
  };
}
