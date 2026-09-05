import type { CustomLesson } from "@/lib/cms";
import { normalizeLessonForEditForm } from "@/lib/lesson-edit-safe";
import {
  DEFAULT_TEACHING_SUBJECT,
  normalizeTeachingSubjectType,
} from "@/lib/teacher-assignment-subject";

/** Map a Supabase `lessons` row into a normalized edit-form lesson (no DB writes). */
export function lessonFromRow(row: Record<string, unknown>): CustomLesson {
  return normalizeLessonForEditForm({
    id: String(row.id),
    grade: String(row.grade ?? ""),
    unit: row.unit as CustomLesson["unit"],
    title: row.title as CustomLesson["title"],
    outcome: row.outcome as CustomLesson["outcome"],
    explanation: row.explanation as CustomLesson["explanation"],
    vocab: row.vocab as CustomLesson["vocab"],
    youtubeUrl: String(row.youtube_url ?? ""),
    youtubeArUrl: row.youtube_url_ar ? String(row.youtube_url_ar) : undefined,
    youtubeEnUrl: row.youtube_url_en ? String(row.youtube_url_en) : undefined,
    pdfUrl: row.pdf_url ? String(row.pdf_url) : undefined,
    pdfName: row.pdf_name ? String(row.pdf_name) : undefined,
    pptUrl: row.ppt_url ? String(row.ppt_url) : undefined,
    pptName: row.ppt_name ? String(row.ppt_name) : undefined,
    worksheetUrl: row.worksheet_url ? String(row.worksheet_url) : undefined,
    worksheetName: row.worksheet_name ? String(row.worksheet_name) : undefined,
    pptArUrl: row.ppt_ar_url ? String(row.ppt_ar_url) : undefined,
    pptEnUrl: row.ppt_en_url ? String(row.ppt_en_url) : undefined,
    worksheetArUrl: row.worksheet_ar_url ? String(row.worksheet_ar_url) : undefined,
    worksheetEnUrl: row.worksheet_en_url ? String(row.worksheet_en_url) : undefined,
    pdfArUrl: row.pdf_ar_url ? String(row.pdf_ar_url) : undefined,
    pdfEnUrl: row.pdf_en_url ? String(row.pdf_en_url) : undefined,
    quiz: Array.isArray(row.quiz) ? row.quiz : [],
    subjectCategory: (row.subject_category as CustomLesson["subjectCategory"]) ?? "quran",
    teachingSubject: normalizeTeachingSubjectType(
      typeof row.teaching_subject === "string" ? row.teaching_subject : DEFAULT_TEACHING_SUBJECT,
    ),
    published: Boolean(row.published),
    createdAt: new Date(String(row.created_at)).getTime(),
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
  });
}
