import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WeeklyPlanForm } from "@/components/weekly-plan-form";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { fetchTeacherContext } from "@/lib/teacher-dashboard";
import {
  buildEmptyWeeklyPlanInput,
  derivePhaseFromGradeSlug,
  fetchWeeklyPlanMasterLists,
  getAssignableGrades,
  getIslamicGroupsForSections,
  getSectionsForGrade,
  type WeeklyPlanMasterList,
} from "@/lib/weekly-planning";
import type { TeacherContext } from "@/lib/teacher-dashboard";

export const Route = createFileRoute("/teacher/weekly-planning/new")({
  component: TeacherWeeklyPlanningNewPage,
});

function TeacherWeeklyPlanningNewPage() {
  const { lang, tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<TeacherContext | null>(null);
  const [masterLists, setMasterLists] = useState<WeeklyPlanMasterList[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const context = await fetchTeacherContext(data.user.id);
        const lists = await fetchWeeklyPlanMasterLists();
        setCtx(context);
        setMasterLists(lists);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !ctx) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  const grades = getAssignableGrades(ctx);
  const initial = buildEmptyWeeklyPlanInput(
    ctx.userId,
    lang === "ar" ? "ar" : "en",
  );
  if (grades[0]) {
    const grade = grades[0];
    const gradeSections = getSectionsForGrade(ctx, grade);
    const selectedSections = gradeSections[0] ? [gradeSections[0]] : [];
    const groups = getIslamicGroupsForSections(ctx, grade, selectedSections);
    initial.grade = grade;
    initial.sections = selectedSections;
    initial.section = selectedSections[0] ?? null;
    initial.islamic_group = groups[0] ?? null;
    initial.phase = derivePhaseFromGradeSlug(grade);
  }

  return (
    <WeeklyPlanForm
      mode="create"
      initial={initial}
      teacherContext={ctx}
      masterLists={masterLists}
      teacherDisplayName={ctx.fullName}
    />
  );
}
