import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { AcademyHomepage } from "@/components/academy-homepage";
import { useI18n } from "@/lib/i18n";
import { homepageHead } from "@/lib/seo";
import { TeacherHomepage } from "@/components/teacher-homepage";
import { useAccountRole, resolveHomeVariant } from "@/hooks/use-account-role";
import { adminHomeNavigateTarget } from "@/lib/account-role";

export const Route = createFileRoute("/")({
  head: () => homepageHead(),
  component: Home,
});

function Home() {
  const {
    sessionExists,
    authLoading,
    role,
    roleLoading,
    roleQueryError,
    roleUnresolved,
  } = useAccountRole();

  const homeVariant = resolveHomeVariant(
    sessionExists,
    roleLoading,
    role,
    roleQueryError,
    roleUnresolved,
  );

  let content: ReactNode;
  if (authLoading || homeVariant === "loading") {
    content = <HomeRoleLoading />;
  } else if (homeVariant === "error") {
    content = <HomeRoleError />;
  } else if (homeVariant === "teacher") {
    content = <TeacherHomepage />;
  } else if (homeVariant === "admin") {
    content = <AdminHomeRedirect />;
  } else if (homeVariant === "student") {
    content = <StudentHomeRedirect />;
  } else if (homeVariant === "parent") {
    content = <ParentHomeRedirect />;
  } else {
    content = <PublicHome signedIn={sessionExists} />;
  }

  return content;
}

function AdminHomeRedirect() {
  const navigate = useNavigate();
  const { tr } = useI18n();

  useEffect(() => {
    navigate({ ...adminHomeNavigateTarget(), replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="container-page flex items-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("verifying_access")}
      </main>
      <SiteFooter />
    </div>
  );
}

function StudentHomeRedirect() {
  const navigate = useNavigate();
  const { tr } = useI18n();

  useEffect(() => {
    navigate({ to: "/student", replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="container-page flex items-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("verifying_access")}
      </main>
      <SiteFooter />
    </div>
  );
}

function ParentHomeRedirect() {
  const navigate = useNavigate();
  const { tr } = useI18n();

  useEffect(() => {
    navigate({ to: "/parent/dashboard", replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="container-page flex items-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("verifying_access")}
      </main>
      <SiteFooter />
    </div>
  );
}

function HomeRoleLoading() {
  const { tr } = useI18n();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="container-page flex items-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </main>
      <SiteFooter />
    </div>
  );
}

function HomeRoleError() {
  const { tr } = useI18n();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="container-page py-24 space-y-2">
        <p className="text-sm font-semibold text-destructive">
          {tr("account_role_error")}
        </p>
        <p className="text-xs text-muted-foreground">
          {tr("session_retry_hint")}
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function PublicHome({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <AcademyHomepage signedIn={signedIn} />
      <SiteFooter />
      <AskMrAhmed />
    </div>
  );
}
