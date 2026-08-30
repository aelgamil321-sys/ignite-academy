import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getAccountRole, navigateTargetForAccountRole } from "@/lib/account-role";
import { useI18n } from "@/lib/i18n";
import { fetchIsLeadTeacher, requireLeadTeacherAccess } from "@/lib/school-management-access";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/teacher/lead")({
  beforeLoad: () => requireLeadTeacherAccess(),
  component: LeadTeacherGate,
});

function LeadTeacherGate() {
  const navigate = useNavigate();
  const { tr } = useI18n();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }
      const role = await getAccountRole(data.user.id);
      if (!active) return;
      if (role === "admin") {
        navigate({ to: "/admin" });
        return;
      }
      if (role !== "teacher") {
        navigate(navigateTargetForAccountRole(role));
        return;
      }
      const isLead = await fetchIsLeadTeacher(data.user.id);
      if (!active) return;
      if (!isLead) {
        setState("denied");
        return;
      }
      setState("ok");
    })();
    return () => {
      active = false;
    };
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
    return <p className="text-sm text-muted-foreground">{tr("lead_teacher_access_denied")}</p>;
  }

  return <Outlet />;
}
