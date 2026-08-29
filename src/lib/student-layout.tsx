import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StudentDashboardShell } from "@/components/student-dashboard-shell";
import { StudentWorkspaceLoading } from "@/components/student-workspace-loading";
import { EmailVerificationRequired } from "@/components/email-verification-required";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { navigateTargetForAccountRole } from "@/lib/account-role";
import { shouldDeferToPasswordReset } from "@/lib/password-recovery";
import type { StudentShellContextValue } from "@/lib/student-shell-context";
import {
  clearStudentShellCache,
  peekStudentShell,
  resolveStudentGate,
  setStudentShellCache,
} from "@/lib/student-workspace-session";

export const studentRouteHead = () => ({
  meta: [
    { title: "Student Dashboard — Ignite Islamic Academy" },
    { name: "robots", content: "noindex,nofollow" },
  ],
});

function StudentAuthFallback({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <h1 className="font-display text-xl font-semibold text-foreground">{title}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function StudentWorkspaceVerifyingSkeleton({
  shell,
}: {
  shell: StudentShellContextValue | null;
}) {
  if (shell) {
    return (
      <StudentDashboardShell value={shell}>
        <StudentWorkspaceLoading />
      </StudentDashboardShell>
    );
  }

  return (
    <div className="flex h-screen min-w-0 flex-row overflow-hidden bg-muted/40">
      <div className="hidden w-[14.5rem] shrink-0 bg-brand-dark/90 lg:block" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="h-14 shrink-0 border-b border-border bg-card" />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          <StudentWorkspaceLoading />
        </main>
      </div>
    </div>
  );
}

export function StudentGate() {
  const navigate = useNavigate();
  const { tr, lang } = useI18n();
  const initialShell = peekStudentShell(lang);
  const [state, setState] = useState<"checking" | "ok" | "error" | "unverified">(
    initialShell ? "ok" : "checking",
  );
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [shellValue, setShellValue] = useState<StudentShellContextValue | null>(initialShell);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (shouldDeferToPasswordReset()) {
        window.location.replace("/reset-password");
        return;
      }

      const cached = peekStudentShell(lang);
      if (cached && active) {
        setState("ok");
        setShellValue(cached);
      }

      const result = await resolveStudentGate(lang);
      if (!active) return;

      if (result.status === "anonymous") {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }
      if (result.status === "unverified") {
        setUnverifiedEmail(result.email);
        setState("unverified");
        return;
      }
      if (result.status === "error") {
        setState("error");
        return;
      }
      if (result.status === "other-role") {
        navigate(navigateTargetForAccountRole(result.role));
        return;
      }

      setStudentShellCache(result.shell.userId, lang, result.shell);
      setShellValue(result.shell);
      setState("ok");
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearStudentShellCache();
        navigate({ to: "/auth", search: { mode: "login" } });
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [lang, navigate]);

  if (state === "unverified") {
    return (
      <StudentAuthFallback title={tr("student_dashboard_title")}>
        <EmailVerificationRequired email={unverifiedEmail} />
      </StudentAuthFallback>
    );
  }

  if (state === "error") {
    return (
      <StudentAuthFallback title={tr("student_dashboard_title")}>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-destructive">
            Could not confirm student role from public.user_roles.
          </p>
          <p className="text-muted-foreground">
            Sign out and sign in again, or contact support if this persists.
          </p>
        </div>
      </StudentAuthFallback>
    );
  }

  if (state !== "ok" || !shellValue) {
    return <StudentWorkspaceVerifyingSkeleton shell={shellValue} />;
  }

  return (
    <StudentDashboardShell value={shellValue}>
      <Outlet />
    </StudentDashboardShell>
  );
}
