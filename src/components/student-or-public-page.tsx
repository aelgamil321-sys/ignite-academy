import type { ReactNode } from "react";
import { PageShell } from "@/components/page-shell";
import { StudentDashboardShell } from "@/components/student-dashboard-shell";
import { StudentWorkspaceLoading } from "@/components/student-workspace-loading";
import { StudentWorkspacePageHeader } from "@/components/student-workspace-page-header";
import type { Crumb } from "@/components/breadcrumbs";
import { useStudentWorkspaceChrome } from "@/hooks/use-student-workspace-chrome";

type StudentOrPublicPageProps = {
  eyebrow?: string;
  title: string;
  lead?: string;
  crumbs?: Crumb[];
  children: ReactNode;
};

export function StudentOrPublicPage({
  eyebrow,
  title,
  lead,
  crumbs,
  children,
}: StudentOrPublicPageProps) {
  const chrome = useStudentWorkspaceChrome();

  if (chrome.status === "student") {
    return (
      <StudentDashboardShell value={chrome.shell}>
        <StudentWorkspacePageHeader eyebrow={eyebrow} title={title} lead={lead} />
        {children}
      </StudentDashboardShell>
    );
  }

  if (chrome.status === "pending") {
    return (
      <PageShell eyebrow={eyebrow} title={title} lead={lead} crumbs={crumbs}>
        <StudentWorkspaceLoading compact />
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow={eyebrow} title={title} lead={lead} crumbs={crumbs}>
      {children}
    </PageShell>
  );
}
