import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { WeeklyPlanningDepartmentDashboard } from "@/components/weekly-planning-department-dashboard";
import { supabase } from "@/integrations/supabase/client";
import { getAccountRole } from "@/lib/account-role";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/weekly-planning/dashboard")({
  head: () => ({
    meta: [
      { title: "Weekly Planning — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminWeeklyPlanningDashboardPage,
});

function AdminWeeklyPlanningDashboardPage() {
  const navigate = useNavigate();
  const { tr } = useI18n();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/admin-login" });
        return;
      }
      const role = await getAccountRole(data.user.id);
      if (role !== "admin") {
        setState("denied");
        return;
      }
      setState("ok");
    })();
  }, [navigate]);

  if (state === "checking") {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  if (state === "denied") {
    return <p className="p-6 text-sm text-muted-foreground">{tr("wp_dept_access_denied")}</p>;
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <WeeklyPlanningDepartmentDashboard
        reviewPlanPath={(planId) => `/admin/weekly-planning/review/${planId}`}
      />
    </div>
  );
}
