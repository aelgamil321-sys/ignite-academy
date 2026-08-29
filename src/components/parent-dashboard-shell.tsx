import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ParentDashboardTopbar } from "@/components/parent-dashboard-topbar";
import { ParentSidebar } from "@/components/parent-sidebar";
import { ParentShellProvider, type ParentShellContextValue } from "@/lib/parent-shell-context";
import { useI18n } from "@/lib/i18n";

type ParentDashboardShellProps = {
  value: ParentShellContextValue;
  children: ReactNode;
};

export function ParentDashboardShell({ value, children }: ParentDashboardShellProps) {
  const { dir } = useI18n();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, hash]);

  return (
    <ParentShellProvider value={value}>
      <div className="flex h-screen min-w-0 flex-row overflow-hidden bg-muted/40" dir={dir}>
        <ParentSidebar
          mobileOpen={mobileNavOpen}
          onMobileOpenChange={setMobileNavOpen}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ParentDashboardTopbar onMenuClick={() => setMobileNavOpen(true)} />
          <main
            ref={mainRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-5 lg:p-6"
          >
            {children}
          </main>
        </div>
      </div>
    </ParentShellProvider>
  );
}
