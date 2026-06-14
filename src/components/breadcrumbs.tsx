import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ReactNode } from "react";

export interface Crumb {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { tr, dir, locale } = useI18n();
  const Sep = (
    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground ${dir === "rtl" ? "rotate-180" : ""}`} />
  );
  const all: Crumb[] = [{ label: tr("bc_home"), to: "/" }, ...items];
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {all.map((c, i) => {
        const isLast = i === all.length - 1;
        const content: ReactNode = c.to && !isLast
          ? <Link to={c.to} params={c.params as never} className="hover:text-primary transition-colors">{c.label}</Link>
          : <span className={isLast ? "text-foreground font-medium" : ""}>{c.label}</span>;
        return (
          <span key={i} className="flex items-center gap-2">
            {content}
            {!isLast && Sep}
          </span>
        );
      })}
    </nav>
  );
}
