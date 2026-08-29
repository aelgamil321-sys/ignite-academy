import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StudentDashboardSectionProps = {
  title: string;
  lead?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  id?: string;
};

export function StudentDashboardSection({
  title,
  lead,
  icon,
  children,
  className,
  action,
  id,
}: StudentDashboardSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {icon ? (
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-foreground sm:text-lg">{title}</h2>
            {lead ? <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{lead}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
