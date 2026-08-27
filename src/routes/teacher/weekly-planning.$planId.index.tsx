import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { WeeklyPlanCompletionPanel, WeeklyPlanStatusBadge } from "@/components/weekly-plan-completion-panel";
import { WeeklyPlanDocumentActions } from "@/components/weekly-plan-document-actions";
import { supabase } from "@/integrations/supabase/client";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { fetchTeacherContext } from "@/lib/teacher-dashboard";
import { fetchWeeklyPlanById, formatWeeklyPlanSectionCodes, weeklyPlanSectionsFromRow, type WeeklyPlanRow } from "@/lib/weekly-planning";

export const Route = createFileRoute("/teacher/weekly-planning/$planId/")({
  component: TeacherWeeklyPlanViewPage,
});

function TeacherWeeklyPlanViewPage() {
  const { planId } = Route.useParams();
  const { lang, tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<WeeklyPlanRow | null>(null);
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const [ctx, row] = await Promise.all([
          fetchTeacherContext(data.user.id),
          fetchWeeklyPlanById(planId),
        ]);
        setTeacherName(ctx.fullName);
        setPlan(row);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [planId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  if (!plan) {
    return <p className="text-sm text-muted-foreground">{tr("wp_not_found")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-foreground">
            {tr("wp_week_n").replace("{n}", String(plan.week_number))} — {plan.lesson_title ?? tr("wp_no_title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {gradeDisplayName(plan.grade, lang)} · {formatWeeklyPlanSectionCodes(weeklyPlanSectionsFromRow(plan), lang)} · {plan.islamic_group ?? "—"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/teacher/weekly-planning/$planId/edit"
            params={{ planId }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            <Pencil className="h-4 w-4" />
            {tr("wp_action_edit")}
          </Link>
          <WeeklyPlanDocumentActions
            plan={plan}
            planId={planId}
            teacherDisplayName={teacherName}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <WeeklyPlanStatusBadge status={plan.status} />
        <span className="text-sm text-muted-foreground">
          {Math.round(plan.completion_percentage * 100)}% {tr("wp_complete_label")}
        </span>
      </div>

      <WeeklyPlanCompletionPanel plan={plan} />

      <div className="rounded-2xl border border-border bg-card p-4 text-sm space-y-2">
        <p><strong>{tr("wp_field_domain")}:</strong> {plan.domain ?? "—"}</p>
        <p><strong>{tr("wp_field_lesson_title")}:</strong> {plan.lesson_title ?? "—"}</p>
        <p><strong>{tr("wp_field_date")}:</strong> {plan.plan_date ?? "—"}</p>
        <p><strong>{tr("wp_field_learning_outcomes")}:</strong> {plan.learning_outcomes ?? "—"}</p>
      </div>

      <Link to="/teacher/weekly-planning" className="text-sm font-medium text-primary hover:underline">
        {tr("wp_back_to_list")}
      </Link>
    </div>
  );
}
