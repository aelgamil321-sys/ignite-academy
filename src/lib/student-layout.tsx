import { Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { StudentDashboardShell } from "@/components/student-dashboard-shell";
import { EmailVerificationRequired } from "@/components/email-verification-required";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { navigateTargetForAccountRole } from "@/lib/account-role";
import { fetchResolvedAccountRole } from "@/hooks/use-account-role";
import { resolveVerifiedSession } from "@/lib/email-verification";
import { shouldDeferToPasswordReset } from "@/lib/password-recovery";
import { isStudentProfileComplete } from "@/lib/student-profile";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import {
  normalizeIslamicGroup,
  normalizeStudentSection,
  type IslamicGroup,
  type StudentSection,
} from "@/lib/student-academics";
import type { StudentShellContextValue } from "@/lib/student-shell-context";

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

export function StudentGate() {
  const navigate = useNavigate();
  const { tr, lang } = useI18n();
  const [state, setState] = useState<"checking" | "ok" | "error" | "unverified">("checking");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [shellValue, setShellValue] = useState<StudentShellContextValue | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (shouldDeferToPasswordReset()) {
        window.location.replace("/reset-password");
        return;
      }
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

      const resolved = await fetchResolvedAccountRole(user.id);
      if (!active) return;

      if (resolved.error || resolved.role === null) {
        setState("error");
        return;
      }

      if (resolved.role !== "student") {
        navigate(navigateTargetForAccountRole(resolved.role));
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "email, grade, arabic_name, english_name, profile_photo_path, section, islamic_group",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      const arabicName = profile?.arabic_name?.trim() ?? "";
      const englishName = profile?.english_name?.trim() ?? "";
      const displayName =
        lang === "ar"
          ? arabicName || englishName || user.email || ""
          : englishName || arabicName || user.email || "";
      const rawGrade = profile?.grade?.trim() ?? "";
      const gradeSlug = rawGrade ? normalizeGradeSlug(rawGrade) : "";

      setShellValue({
        userId: user.id,
        email: profile?.email ?? user.email ?? "",
        displayName,
        arabicName,
        englishName,
        profilePhotoPath: profile?.profile_photo_path ?? null,
        gradeSlug,
        hasGrade: Boolean(gradeSlug),
        section: normalizeStudentSection(profile?.section),
        islamicGroup: normalizeIslamicGroup(profile?.islamic_group),
        profileComplete: isStudentProfileComplete(profile),
      });
      setState("ok");
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth", search: { mode: "login" } });
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
    return (
      <StudentAuthFallback title={tr("student_dashboard_title")}>
        <p className="text-sm text-muted-foreground">{tr("verifying_access")}</p>
      </StudentAuthFallback>
    );
  }

  return (
    <StudentDashboardShell value={shellValue}>
      <Outlet />
    </StudentDashboardShell>
  );
}
