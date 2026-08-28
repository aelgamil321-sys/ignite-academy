import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useCMS } from "@/lib/cms";
import { useI18n, L } from "@/lib/i18n";
import { gradeDisplayName } from "@/lib/grade-utils";
import { LessonQuizPreview } from "@/components/lesson-quiz-preview";
import { fetchAnnouncementCreatorNames } from "@/lib/announcement-creator-names";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/quizzes/$lessonId")({
  head: () => ({
    meta: [
      { title: "Quiz Preview — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminQuizPreviewPage,
});

function AdminQuizPreviewPage() {
  const { lessonId } = Route.useParams();
  const { lessons, loading } = useCMS();
  const { lang, bi, tr } = useI18n();
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const lesson = lessons.find((l) => l.id === lessonId);

  useEffect(() => {
    if (!lesson?.createdBy) {
      setCreatorName(null);
      return;
    }
    void fetchAnnouncementCreatorNames([lesson.createdBy]).then((names) => {
      setCreatorName(names[lesson.createdBy!] ?? null);
    });
  }, [lesson?.createdBy]);

  return (
    <div className="space-y-6 min-w-0 max-w-4xl">
      <Link
        to="/admin"
        search={{ tab: "manage-quizzes" }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {L("Back to Manage Quizzes", "العودة إلى إدارة الاختبارات")[lang]}
      </Link>

      {loading ? (
        <p className="text-sm text-muted-foreground">{L("Loading…", "جارٍ التحميل…")[lang]}</p>
      ) : !lesson ? (
        <p className="text-sm text-destructive">{L("Lesson not found.", "الدرس غير موجود.")[lang]}</p>
      ) : (
        <>
          <div className="space-y-1">
            <h1 className="font-display text-2xl text-foreground">{bi(lesson.title)}</h1>
            <p className="text-sm text-muted-foreground">
              {gradeDisplayName(lesson.grade, lang)}
              {creatorName ? ` · ${creatorName}` : ""}
            </p>
          </div>
          <LessonQuizPreview
            lessonId={lesson.id}
            lessonTitle={lesson.title}
            gradeName={{ en: gradeDisplayName(lesson.grade, "en"), ar: gradeDisplayName(lesson.grade, "ar") }}
            questions={lesson.quiz}
          />
          <Link
            to="/admin/grades/$grade/$lesson"
            params={{ grade: lesson.grade, lesson: lesson.id }}
            className="inline-flex text-sm text-primary hover:underline"
          >
            {tr("admin_content_view_lesson")}
          </Link>
        </>
      )}
    </div>
  );
}
