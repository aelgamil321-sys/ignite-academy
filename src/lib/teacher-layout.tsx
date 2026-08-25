import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { TeacherSidebar } from "@/components/teacher-sidebar";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getAccountRole } from "@/lib/account-role";
import { fetchTeacherContext } from "@/lib/teacher-dashboard";
import { requireTeacherRole } from "@/lib/teacher-route-guard";

export const teacherRouteHead = () => ({
  meta: [
    { title: "Teacher Dashboard — Ignite Islamic Academy" },
    { name: "robots", content: "noindex,nofollow" },
  ],
});

export function TeacherGate() {
  const navigate = useNavigate();
  const { tr } = useI18n();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");
  const [email, setEmail] = useState("");
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!active) return;
      if (!u.user) {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }
      const role = await getAccountRole(u.user.id);
      if (!active) return;
      if (role !== "teacher") {
        setState("denied");
        return;
      }
      const ctx = await fetchTeacherContext(u.user.id);
      if (!active) return;
      setEmail(ctx.email || u.user.email || "");
      setTeacherName(ctx.fullName);
      setState("ok");
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", search: { mode: "login" } });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  if (state === "checking") {
    return (
      <PageShell
        eyebrow={tr("teacher_title")}
        title={tr("teacher_title")}
        lead={tr("verifying_access")}
        crumbs={[{ label: tr("teacher_title") }]}
      >
        <div className="text-sm text-muted-foreground">{tr("verifying_access")}</div>
      </PageShell>
    );
  }

  if (state === "denied") {
    return (
      <PageShell
        eyebrow={tr("teacher_title")}
        title={tr("teacher_title")}
        lead={tr("teacher_access_denied")}
        crumbs={[{ label: tr("teacher_title") }]}
      >
        <div className="text-sm text-muted-foreground">{tr("teacher_access_denied")}</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={tr("teacher_title")}
      title={tr("teacher_welcome")}
      lead={tr("teacher_lead")}
      crumbs={[{ label: tr("teacher_title") }]}
    >
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] items-start">
        <TeacherSidebar email={email} teacherName={teacherName} />
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </PageShell>
  );
}
