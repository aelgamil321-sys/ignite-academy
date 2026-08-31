import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LessonEditForm } from "@/components/lesson-edit-form";
import { lessonHasSavedAiGeneratedContent } from "@/lib/lesson-ai-saved-content";
import { bilingualFilesFromLesson } from "@/lib/lesson-bilingual-files";
import { hasMainLessonFile } from "@/lib/lesson-main-file";
import { parseLocalizedText } from "@/lib/lesson-localized";
import { parseVocabFromStorage } from "@/lib/lesson-vocab";
import { useCMS, type CustomLesson } from "@/lib/cms";
import { useI18n, L } from "@/lib/i18n";
import { normalizeQuizList } from "@/lib/lesson-quiz";
import {
  adminContentIsReadOnly,
  useAdminContentActor,
} from "@/lib/admin-content-ownership";
import type { Bi } from "@/lib/curriculum";

export const Route = createFileRoute("/admin/lessons/edit/$lessonId")({
  head: () => ({
    meta: [
      { title: "Edit Lesson — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLessonEditPage,
});

function lessonFromRow(row: Record<string, unknown>): CustomLesson {
  return {
    id: String(row.id),
    grade: String(row.grade ?? ""),
    unit: parseLocalizedText(row.unit) as Bi,
    title: parseLocalizedText(row.title) as Bi,
    outcome: parseLocalizedText(row.outcome) as Bi,
    explanation: parseLocalizedText(row.explanation) as Bi,
    vocab: parseVocabFromStorage(row.vocab),
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
    quiz: normalizeQuizList(Array.isArray(row.quiz) ? row.quiz : []),
    subjectCategory: (row.subject_category as CustomLesson["subjectCategory"]) ?? "quran",
    published: Boolean(row.published),
    createdAt: new Date(String(row.created_at)).getTime(),
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
  };
}

function AdminLessonEditPage() {
  const navigate = useNavigate();
  const { lessonId } = Route.useParams();
  const { lang } = useI18n();
  const { refresh } = useCMS();
  const actorId = useAdminContentActor();
  const [lesson, setLesson] = useState<CustomLesson | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Load by lesson ID only — do not resync from CMS lessons[] after publish (matches teacher edit).
  useEffect(() => {
    let active = true;
    setFetching(true);
    setLesson(null);

    const load = async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setLesson(null);
        setFetching(false);
        return;
      }
      setLesson(lessonFromRow(data as Record<string, unknown>));
      setFetching(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [lessonId]);

  const backToManage = () => {
    navigate({ to: "/admin/lessons" });
  };

  const handlePublishChange = (nextPublished: boolean) => {
    setLesson((current) => (current ? { ...current, published: nextPublished } : current));
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <Link
        to="/admin/lessons"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {L("Back to Manage Lessons", "العودة إلى إدارة الدروس")[lang]}
      </Link>

      {fetching ? (
        <div className="text-sm text-muted-foreground">
          {L("Loading lesson…", "جارٍ تحميل الدرس…")[lang]}
        </div>
      ) : !lesson ? (
        <div className="text-sm text-destructive">
          {L("Lesson not found.", "الدرس غير موجود.")[lang]}
        </div>
      ) : (
        <LessonEditForm
          key={lesson.id}
          lesson={lesson}
          formMode={
            lessonHasSavedAiGeneratedContent(lesson) ||
            hasMainLessonFile(bilingualFilesFromLesson(lesson), lesson)
              ? "simplified"
              : "full"
          }
          readOnly={adminContentIsReadOnly("lesson", lesson.createdBy, actorId)}
          onPublishChange={handlePublishChange}
          onSaved={() => {
            void refresh();
            backToManage();
          }}
          onCancel={backToManage}
        />
      )}
    </div>
  );
}
