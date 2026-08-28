import { Link } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { TKey } from "@/lib/i18n";

type ViewLinkProps = {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  labelKey?: TKey;
  className?: string;
};

export function AdminContentViewLink({
  to,
  params,
  search,
  labelKey = "admin_content_view",
  className,
}: ViewLinkProps) {
  const { tr } = useI18n();
  return (
    <Link
      to={to}
      params={params}
      search={search}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
      }
    >
      <Eye className="h-3.5 w-3.5" />
      {tr(labelKey)}
    </Link>
  );
}
