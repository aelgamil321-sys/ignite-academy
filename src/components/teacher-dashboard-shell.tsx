import type { ReactNode } from "react";
import { useState } from "react";
import { TeacherDashboardTopbar } from "@/components/teacher-dashboard-topbar";
import { TeacherSidebar } from "@/components/teacher-sidebar";
import type { TeacherContext } from "@/lib/teacher-dashboard";
import { TeacherShellProvider } from "@/lib/teacher-shell-context";
import { useI18n } from "@/lib/i18n";

type TeacherDashboardShellProps = {
  email: string;
  teacherName: string;
  context: TeacherContext | null;
  profilePhotoPath?: string | null;
  children: ReactNode;
};

export function TeacherDashboardShell({
  email,
  teacherName,
  context,
  profilePhotoPath = null,
  children,
}: TeacherDashboardShellProps) {
  const { dir } = useI18n();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <TeacherShellProvider
      value={{
        context,
        teacherName,
        email,
        profilePhotoPath,
      }}
    >
      <div className="flex h-screen min-w-0 flex-row overflow-hidden bg-muted/40" dir={dir}>
        <TeacherSidebar
          email={email}
          teacherName={teacherName}
          isLeadTeacher={context?.isLeadTeacher ?? false}
          mobileOpen={mobileNavOpen}
          onMobileOpenChange={setMobileNavOpen}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <TeacherDashboardTopbar
            teacherName={teacherName}
            profilePhotoPath={profilePhotoPath}
            onMenuClick={() => setMobileNavOpen(true)}
          />
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-5 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </TeacherShellProvider>
  );
}
