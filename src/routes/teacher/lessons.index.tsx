import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCMS } from "@/lib/cms";
import { useI18n } from "@/lib/i18n";
import { teachingSubjectLabel } from "@/lib/teacher-assignment-subject";
import {
  fetchTeacherContext,
  teacherAssignedGradesForSubject,
  teacherLessonInScope,
  type TeacherContext,
} from "@/lib/teacher-dashboard";
import { TeacherDeleteLessonButton } from "@/components/teacher-delete-lesson-button";
import { TeacherLessonPublishButton } from "@/components/teacher-lesson-publish-button";
import { TeacherLessonStatusBadge } from "@/components/teacher-lesson-status-badge";

export const Route = createFileRoute("/teacher/lessons/")({
  component: TeacherLessonsPage,
});

function TeacherLessonsPage() {
  const { bi, tr, lang } = useI18n();
  const { lessons, loading, refresh } = useCMS();
  const [context, setContext] = useState<TeacherContext | null>(null);
  const [init, setInit] = useState(true);

  useEffect(() => {
    void refresh();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const ctx = await fetchTeacherContext(data.user.id);
      setContext(ctx);
      setInit(false);
    })();
  }, [refresh]);

  const canCreateLesson = useMemo(() => {
    if (!context) return false;
    return (
      teacherAssignedGradesForSubject(context, "islamic_education").length > 0 ||
      teacherAssignedGradesForSubject(context, "quran").length > 0
    );
  }, [context]);

  const scopedLessons = useMemo(() => {
    if (!context) return [];
    return lessons.filter((lesson) => teacherLessonInScope(context, lesson));
  }, [lessons, context]);

  if (loading || init) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_lessons")}</h2>
        {canCreateLesson && (
          <Link
            to="/teacher/lessons/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            {tr("teacher_nav_add_lesson")}
          </Link>
        )}
      </div>
      {scopedLessons.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("teacher_no_lessons")}</p>
      ) : (
        <ul className="space-y-3">
          {scopedLessons.map((lesson) => (
            <li
              key={lesson.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium text-foreground">{bi(lesson.title)}</div>
                  <TeacherLessonStatusBadge published={lesson.published} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {teachingSubjectLabel(lesson.teachingSubject, lang)} · {lesson.grade} ·{" "}
                  {bi(lesson.unit) || "—"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TeacherLessonPublishButton
                  lesson={lesson}
                  published={lesson.published}
                  compact
                  onUpdated={() => void refresh()}
                />
                <Link
                  to="/teacher/lessons/edit/$lessonId"
                  params={{ lessonId: lesson.id }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {tr("teacher_edit")}
                </Link>
                <TeacherDeleteLessonButton lesson={lesson} onDeleted={() => void refresh()} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
