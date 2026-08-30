import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSchoolManagementPaths } from "@/lib/workspace-paths";

export function LeadTeacherPageHeader({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  const { tr, dir } = useI18n();
  const paths = useSchoolManagementPaths();

  return (
    <div className="mb-6 space-y-4">
      <Link
        to={paths.overview}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
        {tr("lead_teacher_back_overview")}
      </Link>
      <div className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {tr("lead_teacher_nav_section")}
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl text-foreground">{title}</h1>
        {lead ? <p className="mt-2 text-sm text-muted-foreground max-w-3xl">{lead}</p> : null}
        {children}
      </div>
    </div>
  );
}
