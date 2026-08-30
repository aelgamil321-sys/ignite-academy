import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WeeklyPlanCompletionPanel, WeeklyPlanStatusBadge } from "@/components/weekly-plan-completion-panel";
import { WeeklyPlanDocumentActions } from "@/components/weekly-plan-document-actions";
import { supabase } from "@/integrations/supabase/client";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { fetchTeacherDisplayName, resolveTeacherDisplayName } from "@/lib/teacher-identity";
import {
  fetchWeeklyPlanById,
  formatWeeklyPlanSectionCodes,
  weeklyPlanSectionsFromRow,
  type WeeklyPlanRow,
} from "@/lib/weekly-planning";

export function WeeklyPlanDepartmentReview({
  planId,
  backTo,
  backLabel,
}: {
  planId: string;
  backTo: string;
  backLabel?: string;
}) {
  const { lang, tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<WeeklyPlanRow | null>(null);
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const row = await fetchWeeklyPlanById(planId);
        setPlan(row);
        if (row) {
          const { data } = await supabase
            .from("profiles")
            .select("full_name, english_name, arabic_name, email")
            .eq("user_id", row.teacher_id)
            .maybeSingle();
          let name = resolveTeacherDisplayName(row.teacher_id, data ?? {});
          if (name === "—") {
            name = await fetchTeacherDisplayName(row.teacher_id);
          }
          setTeacherName(name);
        }
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
            {teacherName} · {gradeDisplayName(plan.grade, lang)} ·{" "}
            {formatWeeklyPlanSectionCodes(weeklyPlanSectionsFromRow(plan), lang)} · {plan.islamic_group ?? "—"}
          </p>
        </div>
        <WeeklyPlanDocumentActions
          plan={plan}
          planId={planId}
          teacherDisplayName={teacherName}
        />
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

      <Link to={backTo} className="text-sm font-medium text-primary hover:underline">
        {backLabel ?? tr("wp_dept_back_dashboard")}
      </Link>
    </div>
  );
}
