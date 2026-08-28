import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  BellRing,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Users,
} from "lucide-react";
import { TeacherDashboardSection } from "@/components/teacher-dashboard-section";
import {
  fetchTeacherDashboardAttention,
  type TeacherAttentionItem,
  type TeacherAttentionSeverity,
} from "@/lib/teacher-dashboard-attention";
import type { ScopedStudentRow, TeacherContext } from "@/lib/teacher-dashboard";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<TeacherAttentionSeverity, string> = {
  high: "border-amber-500/30 bg-amber-500/5",
  medium: "border-primary/25 bg-primary/5",
  low: "border-border bg-muted/20",
};

const TYPE_ICONS = {
  quiz_pending_review: ClipboardCheck,
  assignment_grading: BookOpenCheck,
  weekly_planning: AlertCircle,
  at_risk_students: Users,
} as const;

export type TeacherNeedsAttentionProps = {
  context: TeacherContext;
  students: ScopedStudentRow[];
};

export function TeacherNeedsAttention({ context, students }: TeacherNeedsAttentionProps) {
  const { tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [items, setItems] = useState<TeacherAttentionItem[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void fetchTeacherDashboardAttention(context, students)
      .then((result) => {
        if (!active) return;
        setItems(result);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [context, students]);

  return (
    <TeacherDashboardSection
      title={tr("teacher_dash_section_needs_attention")}
      icon={<BellRing className="h-5 w-5" />}
    >
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("teacher_loading")}
        </div>
      ) : error ? (
        <p className="py-4 text-sm text-muted-foreground">{tr("teacher_dash_widget_load_error")}</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">{tr("teacher_attn_all_clear")}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            return (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex min-h-11 min-w-0 items-start gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40",
                    SEVERITY_STYLES[item.severity],
                  )}
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/80 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{tr(item.titleKey)}</span>
                      <span className="rounded-full bg-brand-dark px-2 py-0.5 text-xs font-bold text-primary">
                        {item.count}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {tr(item.descriptionKey)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </TeacherDashboardSection>
  );
}
