import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { StudentDashboardShell } from "@/components/student-dashboard-shell";
import { StudentWorkspaceLoading } from "@/components/student-workspace-loading";
import { useStudentWorkspaceChrome } from "@/hooks/use-student-workspace-chrome";

export function StudentOrPublicSiteLayout({ children }: { children: ReactNode }) {
  const chrome = useStudentWorkspaceChrome();

  if (chrome.status === "student") {
    return <StudentDashboardShell value={chrome.shell}>{children}</StudentDashboardShell>;
  }

  if (chrome.status === "pending") {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container-page flex-1 py-12">
          <StudentWorkspaceLoading />
        </main>
        <SiteFooter />
        <AskMrAhmed />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container-page flex-1">{children}</main>
      <SiteFooter />
      <AskMrAhmed />
    </div>
  );
}
