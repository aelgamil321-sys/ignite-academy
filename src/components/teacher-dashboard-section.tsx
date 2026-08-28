import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TeacherDashboardSectionProps = {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function TeacherDashboardSection({
  title,
  icon,
  children,
  className,
  action,
}: TeacherDashboardSectionProps) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
          <h3 className="font-display text-base text-foreground sm:text-lg">{title}</h3>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
