import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { GhirasDashboardPane } from "@/components/brand/ghiras-watermark";
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
  const mainRef = useRef<HTMLMainElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, hash]);

  return (
    <StudentShellProvider value={value}>
      <div className="flex h-screen min-w-0 flex-row overflow-hidden bg-muted/40" dir={dir}>
        <StudentSidebar
          mobileOpen={mobileNavOpen}
          onMobileOpenChange={setMobileNavOpen}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <StudentDashboardTopbar onMenuClick={() => setMobileNavOpen(true)} />
          <GhirasDashboardPane mainRef={mainRef}>{children}</GhirasDashboardPane>
        </div>
      </div>
    </StudentShellProvider>
  );
}
