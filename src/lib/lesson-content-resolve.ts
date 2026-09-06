import type { EducationalContentType } from "@/lib/translate-educational-content";

/** Lesson fields that must resolve the exact stored language slot — no cross-lang fallback. */
const STRICT_LESSON_CONTENT_TYPES = new Set<EducationalContentType>([
  "title",
  "outcome",
  "content",
  "vocab_term",
  "vocab_def",
  "quiz_question",
  "quiz_option",
  "quiz_feedback",
  "quiz_result",
  "instruction",
]);

export function isStrictLessonContentType(contentType?: EducationalContentType): boolean {
  if (!contentType) return false;
  return STRICT_LESSON_CONTENT_TYPES.has(contentType);
}
