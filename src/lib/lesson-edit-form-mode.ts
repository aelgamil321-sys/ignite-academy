import type { CustomLesson } from "@/lib/cms";
import { lessonHasSavedAiGeneratedContent } from "@/lib/lesson-ai-saved-content";
import { bilingualFilesFromLesson } from "@/lib/lesson-bilingual-files";
import { hasMainLessonFile } from "@/lib/lesson-main-file";

export type LessonEditFormMode = "full" | "simplified";

/** Resolve admin/legacy edit layout without throwing on malformed optional AI fields. */
export function resolveLessonEditFormMode(lesson: CustomLesson): LessonEditFormMode {
  try {
    if (lessonHasSavedAiGeneratedContent(lesson)) return "simplified";
  } catch (error) {
    console.error("[lesson-edit-form-mode] AI detection failed", error);
  }
  if (hasMainLessonFile(bilingualFilesFromLesson(lesson), lesson)) return "simplified";
  return "full";
}
