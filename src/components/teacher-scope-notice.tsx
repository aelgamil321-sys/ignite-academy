import { Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function TeacherScopeNotice() {
  const { tr } = useI18n();

  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-brand-dark/15 bg-brand-dark/[0.04] px-4 py-3.5 sm:items-center sm:px-5">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-dark text-primary">
        <Shield className="h-4 w-4" aria-hidden />
      </span>
      <p className="min-w-0 text-sm leading-relaxed text-foreground/85">{tr("teacher_dash_scope_notice")}</p>
    </div>
  );
}
