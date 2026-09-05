import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { LessonCreateDraftForm } from "@/components/lesson-create-draft-form";
import {
  fetchTeacherContext,
  teacherAssignedGradesForSubject,
  type TeacherContext,
} from "@/lib/teacher-dashboard";

export const Route = createFileRoute("/teacher/lessons/new")({
  component: TeacherNewLessonPage,
});

function TeacherNewLessonPage() {
  const { tr } = useI18n();
  const [context, setContext] = useState<TeacherContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setLoading(false);
        return;
      }
      const ctx = await fetchTeacherContext(data.user.id);
      setContext(ctx);
      setLoading(false);
    })();
  }, []);

  const allowedGradesBySubject = useMemo(
    () =>
      context
        ? {
            islamic_education: teacherAssignedGradesForSubject(context, "islamic_education"),
            quran: teacherAssignedGradesForSubject(context, "quran"),
          }
        : undefined,
    [context],
  );

  const hasAnyAssignment = useMemo(() => {
    if (!allowedGradesBySubject) return false;
    return (
      allowedGradesBySubject.islamic_education.length > 0 ||
      allowedGradesBySubject.quran.length > 0
    );
  }, [allowedGradesBySubject]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  if (!context || !hasAnyAssignment || !allowedGradesBySubject) {
    return (
      <div className="mx-auto w-full max-w-[1050px] space-y-4">
        <Link
          to="/teacher/lessons"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          {tr("teacher_back_lessons")}
        </Link>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          {tr("teacher_no_classes")}
        </div>
      </div>
    );
  }

  const unionGrades = [
    ...new Set([
      ...allowedGradesBySubject.islamic_education,
      ...allowedGradesBySubject.quran,
    ]),
  ];

  return (
    <LessonCreateDraftForm
      allowedGradeSlugs={unionGrades}
      allowedGradesBySubject={allowedGradesBySubject}
      backTo="/teacher/lessons"
      backLabel={tr("teacher_back_lessons")}
      editTo="/teacher/lessons/edit/$lessonId"
    />
  );
}
