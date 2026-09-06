import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LessonCreateDraftForm } from "@/components/lesson-create-draft-form";
import { teacherAssignedGradesForSubject } from "@/lib/teacher-dashboard";
import { useTeacherShell } from "@/lib/teacher-shell-context";

export const Route = createFileRoute("/teacher/lessons/new")({
  component: TeacherNewLessonPage,
});

function TeacherNewLessonPage() {
  const { tr } = useI18n();
  const { context } = useTeacherShell();

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
