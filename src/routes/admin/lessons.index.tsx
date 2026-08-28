import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useCMS } from "@/lib/cms";
import { useI18n, L } from "@/lib/i18n";
import {
  adminContentIsReadOnly,
  useAdminContentActor,
} from "@/lib/admin-content-ownership";
import { AdminContentViewLink } from "@/components/admin-content-view-link";
import { fetchAnnouncementCreatorNames } from "@/lib/announcement-creator-names";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/lessons/")({
  head: () => ({
    meta: [
      { title: "Manage Lessons — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLessonsPage,
});

function AdminLessonsPage() {
  const { lessons, loading } = useCMS();
  const { lang, bi, tr } = useI18n();
  const actorId = useAdminContentActor();
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = lessons.map((l) => l.createdBy).filter(Boolean) as string[];
    if (ids.length === 0) {
      setCreatorNames({});
      return;
    }
    void fetchAnnouncementCreatorNames(ids).then(setCreatorNames);
  }, [lessons]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-foreground">
        {L("Manage Lessons", "إدارة الدروس")[lang]}
      </h1>
      <p className="text-sm text-muted-foreground max-w-3xl">
        {L(
          "Admins can monitor all lessons. Teacher-owned or legacy lessons open in view mode.",
          "يمكن للإدارة مراقبة جميع الدروس. دروس المعلمين أو الدروس القديمة تُفتح في وضع العرض.",
        )[lang]}
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">{L("Loading lessons…", "جارٍ تحميل الدروس…")[lang]}</p>
      ) : lessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">No lessons found.</p>
      ) : (
        <ul className="space-y-3">
          {lessons.map((lesson) => {
            const readOnly = adminContentIsReadOnly("lesson", lesson.createdBy, actorId);
            const creatorName = lesson.createdBy ? creatorNames[lesson.createdBy] : null;
            return (
              <li
                key={lesson.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="font-medium text-foreground">{bi(lesson.title)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {lesson.grade} · {bi(lesson.unit) || "—"}
                    {" · "}
                    {lesson.published ? L("Published", "منشور")[lang] : L("Draft", "مسودة")[lang]}
                    {creatorName ? ` · ${creatorName}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminContentViewLink
                    to="/admin/grades/$grade/$lesson"
                    params={{ grade: lesson.grade, lesson: lesson.id }}
                  />
                  {!readOnly ? (
                    <Link
                      to="/admin/lessons/edit/$lessonId"
                      params={{ lessonId: lesson.id }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {L("Edit", "تعديل")[lang]}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
