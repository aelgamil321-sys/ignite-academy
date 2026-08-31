import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { LessonEditForm } from "@/components/lesson-edit-form";
import { AdminLessonEditErrorBoundary } from "@/components/admin-lesson-edit-error-boundary";
import { useLessonEditController } from "@/hooks/use-lesson-edit-controller";
import { resolveLessonEditFormMode } from "@/lib/lesson-edit-form-mode";
import { useI18n, L } from "@/lib/i18n";
import {
  adminContentIsReadOnly,
  useAdminContentActor,
} from "@/lib/admin-content-ownership";

export const Route = createFileRoute("/admin/lessons/edit/$lessonId")({
  head: () => ({
    meta: [
      { title: "Edit Lesson — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLessonEditPage,
});

function AdminLessonEditPage() {
  const navigate = useNavigate();
  const { lessonId } = Route.useParams();
  const { lang } = useI18n();
  const actorId = useAdminContentActor();

  const {
    lesson,
    error,
    timedOut,
    retry,
    handlePublishChange,
    refreshCms,
    isLoading,
    isNotFound,
    isError,
    isReady,
  } = useLessonEditController({
    lessonId,
    refreshCmsOnMount: true,
    logScope: "admin-lesson-edit",
  });

  const backToManage = () => {
    navigate({ to: "/admin/lessons" });
  };

  const loadFailedMessage = L(
    "Could not load lesson data. Try again.",
    "تعذر تحميل بيانات الدرس. حاول مرة أخرى.",
  )[lang];

  return (
    <div className="space-y-4 max-w-4xl">
      <Link
        to="/admin/lessons"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {L("Back to Manage Lessons", "العودة إلى إدارة الدروس")[lang]}
      </Link>

      {timedOut ? (
        <div className="space-y-3 text-sm">
          <p className="text-destructive">{loadFailedMessage}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted"
          >
            {L("Try again", "حاول مرة أخرى")[lang]}
          </button>
        </div>
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground">
          {L("Loading lesson…", "جارٍ تحميل الدرس…")[lang]}
        </div>
      ) : isError ? (
        <div className="space-y-3 text-sm">
          <p className="text-destructive">{error ?? loadFailedMessage}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted"
          >
            {L("Try again", "حاول مرة أخرى")[lang]}
          </button>
        </div>
      ) : isNotFound ? (
        <div className="text-sm text-destructive">
          {L("Lesson not found.", "الدرس غير موجود.")[lang]}
        </div>
      ) : isReady && lesson ? (
        <AdminLessonEditErrorBoundary>
          <LessonEditForm
            key={lesson.id}
            lesson={lesson}
            formMode={resolveLessonEditFormMode(lesson)}
            readOnly={adminContentIsReadOnly("lesson", lesson.createdBy, actorId)}
            onPublishChange={handlePublishChange}
            onSaved={() => {
              void refreshCms();
              backToManage();
            }}
            onCancel={backToManage}
          />
        </AdminLessonEditErrorBoundary>
      ) : null}
    </div>
  );
}
