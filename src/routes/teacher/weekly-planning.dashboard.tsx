import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { WeeklyPlanningDepartmentDashboard } from "@/components/weekly-planning-department-dashboard";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { canAccessWeeklyPlanningDepartmentDashboard } from "@/lib/weekly-planning-dashboard";

export const Route = createFileRoute("/teacher/weekly-planning/dashboard")({
  component: LeadTeacherWeeklyPlanningDashboardPage,
});

function LeadTeacherWeeklyPlanningDashboardPage() {
  const navigate = useNavigate();
  const { tr } = useI18n();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }
      const allowed = await canAccessWeeklyPlanningDepartmentDashboard(data.user.id);
      if (!allowed) {
        setState("denied");
        return;
      }
      setState("ok");
    })();
  }, [navigate]);

  if (state === "checking") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  if (state === "denied") {
    return <p className="text-sm text-muted-foreground">{tr("wp_dept_access_denied")}</p>;
  }

  return (
    <WeeklyPlanningDepartmentDashboard
      reviewPlanPath={(planId) => `/teacher/weekly-planning/review/${planId}`}
    />
  );
}
