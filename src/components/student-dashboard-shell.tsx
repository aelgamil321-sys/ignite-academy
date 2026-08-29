import type { ReactNode } from "react";
import { useState } from "react";
import { StudentDashboardTopbar } from "@/components/student-dashboard-topbar";
import { StudentSidebar } from "@/components/student-sidebar";
import { StudentShellProvider, type StudentShellContextValue } from "@/lib/student-shell-context";
import { useI18n } from "@/lib/i18n";

type StudentDashboardShellProps = {
  value: StudentShellContextValue;
  children: ReactNode;
};

export function StudentDashboardShell({ value, children }: StudentDashboardShellProps) {
  const { dir } = useI18n();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <StudentShellProvider value={value}>
      <div className="flex h-screen min-w-0 flex-row overflow-hidden bg-muted/40" dir={dir}>
        <StudentSidebar
          mobileOpen={mobileNavOpen}
          onMobileOpenChange={setMobileNavOpen}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <StudentDashboardTopbar onMenuClick={() => setMobileNavOpen(true)} />
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-5 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </StudentShellProvider>
  );
}
