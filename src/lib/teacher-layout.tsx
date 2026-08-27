import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { TeacherSidebar } from "@/components/teacher-sidebar";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { destinationForAccountRole, getAccountRole } from "@/lib/account-role";
import { fetchTeacherContext } from "@/lib/teacher-dashboard";
import { resolveVerifiedSession } from "@/lib/email-verification";
import { EmailVerificationRequired } from "@/components/email-verification-required";

export const teacherRouteHead = () => ({
  meta: [
    { title: "Teacher Dashboard — Ignite Islamic Academy" },
    { name: "robots", content: "noindex,nofollow" },
  ],
});

export function TeacherGate() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isWeeklyPlanPrint =
    pathname.includes("/weekly-planning/") && pathname.endsWith("/print");
  const { tr } = useI18n();
  const [state, setState] = useState<"checking" | "ok" | "unverified">("checking");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [email, setEmail] = useState("");
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    let active = true;
    const check = async () => {
      const session = await resolveVerifiedSession();
      if (!active) return;
      if (session.status === "none") {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }
      if (session.status === "unverified") {
        setUnverifiedEmail(session.email);
        setState("unverified");
        return;
      }
      const user = session.user;
      const role = await getAccountRole(user.id);
      if (!active) return;
      if (role !== "teacher") {
        navigate({ to: destinationForAccountRole(role) });
        return;
      }
      const ctx = await fetchTeacherContext(user.id);
      if (!active) return;
      setEmail(ctx.email || user.email || "");
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

  if (state === "unverified") {
    return (
      <PageShell
        eyebrow={tr("teacher_title")}
        title={tr("teacher_title")}
        lead={tr("auth_email_not_confirmed")}
        crumbs={[{ label: tr("teacher_title") }]}
      >
        <EmailVerificationRequired email={unverifiedEmail} />
      </PageShell>
    );
  }

  if (state !== "ok") {
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

  if (isWeeklyPlanPrint) {
    return <Outlet />;
  }

  return (
    <PageShell
      eyebrow={tr("teacher_title")}
      title={tr("teacher_welcome")}
      lead={tr("teacher_lead")}
      crumbs={[{ label: tr("teacher_title") }]}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(280px,300px)_1fr] items-start">
        <TeacherSidebar email={email} teacherName={teacherName} />
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </PageShell>
  );
}
