import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WeeklyPlanForm } from "@/components/weekly-plan-form";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { fetchTeacherContext, type TeacherContext } from "@/lib/teacher-dashboard";
import {
  fetchWeeklyPlanById,
  fetchWeeklyPlanMasterLists,
  normalizeWeeklyPlanInputFields,
  weeklyPlanSectionsFromRow,
  type CreateWeeklyPlanInput,
  type WeeklyPlanMasterList,
  type WeeklyPlanRow,
} from "@/lib/weekly-planning";

export const Route = createFileRoute("/teacher/weekly-planning/$planId/edit")({
  component: TeacherWeeklyPlanEditPage,
});

function toInput(plan: WeeklyPlanRow): CreateWeeklyPlanInput {
  const {
    id: _id,
    created_at: _c,
    updated_at: _u,
    status: _s,
    completion_percentage: _p,
    sections_key: _sk,
    ...rest
  } = plan;
  const sections = weeklyPlanSectionsFromRow(plan);
  return {
    ...rest,
    sections,
    section: sections[0] ?? null,
  };
}

function TeacherWeeklyPlanEditPage() {
  const { planId } = Route.useParams();
  const { tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<TeacherContext | null>(null);
  const [masterLists, setMasterLists] = useState<WeeklyPlanMasterList[]>([]);
  const [initial, setInitial] = useState<CreateWeeklyPlanInput | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const [context, lists, plan] = await Promise.all([
          fetchTeacherContext(data.user.id),
          fetchWeeklyPlanMasterLists(),
          fetchWeeklyPlanById(planId),
        ]);
        if (!plan) {
          toast.error(tr("wp_not_found"));
          return;
        }
        setCtx(context);
        setMasterLists(lists);
        setInitial(normalizeWeeklyPlanInputFields(toInput(plan), lists));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [planId, tr]);

  if (loading || !ctx || !initial) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <WeeklyPlanForm
      mode="edit"
      planId={planId}
      initial={initial}
      teacherContext={ctx}
      masterLists={masterLists}
      teacherDisplayName={ctx.fullName}
    />
  );
}
