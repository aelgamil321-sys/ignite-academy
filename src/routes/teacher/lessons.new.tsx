import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { LessonCreateDraftForm } from "@/components/lesson-create-draft-form";
import { fetchTeacherContext } from "@/lib/teacher-dashboard";

export const Route = createFileRoute("/teacher/lessons/new")({
  component: TeacherNewLessonPage,
});

function TeacherNewLessonPage() {
  const { lang, tr } = useI18n();
  const [assignedGrades, setAssignedGrades] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setLoading(false);
        return;
      }
      const ctx = await fetchTeacherContext(data.user.id);
      setAssignedGrades(ctx.assignedGrades.map(normalizeGradeSlug));
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  if (assignedGrades.length === 0) {
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

  return (
    <LessonCreateDraftForm
      allowedGradeSlugs={assignedGrades}
      backTo="/teacher/lessons"
      backLabel={tr("teacher_back_lessons")}
      editTo="/teacher/lessons/edit/$lessonId"
    />
  );
}
