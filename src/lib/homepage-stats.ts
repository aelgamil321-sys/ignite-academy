import { serializeQuizForSave } from "@/lib/lesson-quiz";
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

/** Count every non-empty video URL field on a lesson. */
export function countLessonVideoUrls(lesson: LessonStatsSource): number {
  return VIDEO_URL_FIELDS.reduce((sum, key) => {
    const value = lesson[key];
    return sum + (typeof value === "string" && hasNonEmptyUrl(value) ? 1 : 0);
  }, 0);
}

/** Count all uploaded educational files (worksheets, PDFs, PowerPoints). */
export function countLessonEducationalFiles(lesson: LessonStatsSource): number {
  return EDUCATIONAL_FILE_FIELDS.reduce((sum, key) => {
    const value = lesson[key];
    return sum + (typeof value === "string" && hasNonEmptyUrl(value) ? 1 : 0);
  }, 0);
}

/** Saved quiz questions with question text (matches admin save rules). */
export function countLessonQuizQuestions(lesson: LessonStatsSource): number {
  return serializeQuizForSave(lesson.quiz).length;
}

export type HomepageStats = {
  lessonCount: number;
  videoCount: number;
  educationalFileCount: number;
  assessmentCount: number;
};

/** Aggregate homepage statistics from published lessons. */
export function computeHomepageStats(lessons: LessonStatsSource[]): HomepageStats {
  const published = lessons.filter((l) => l.published);

  return {
    lessonCount: published.length,
    videoCount: published.reduce((sum, l) => sum + countLessonVideoUrls(l), 0),
    educationalFileCount: published.reduce((sum, l) => sum + countLessonEducationalFiles(l), 0),
    assessmentCount: published.reduce((sum, l) => sum + countLessonQuizQuestions(l), 0),
  };
}
