import { Link } from "@tanstack/react-router";
import { AlertCircle, BellRing, BookOpen, ClipboardCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { localeForFormatting } from "@/lib/i18n-config";
import type { StudentAttentionItem } from "@/lib/student-dashboard-attention";
import { cn } from "@/lib/utils";

const KIND_ICONS = {
  missing_assignment: AlertCircle,
  upcoming_assignment: ClipboardCheck,
  incomplete_lessons: BookOpen,
} as const;

type StudentNeedsAttentionProps = {
  items: StudentAttentionItem[];
};

export function StudentNeedsAttention({ items }: StudentNeedsAttentionProps) {
  const { tr, trf, bi, lang } = useI18n();

  const formatDue = (iso: string) =>
    new Date(iso).toLocaleString(localeForFormatting(lang), {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const kindLabel = (kind: StudentAttentionItem["kind"]) => {
    switch (kind) {
      case "missing_assignment":
        return tr("student_dash_attention_missing_assignment");
      case "upcoming_assignment":
        return tr("student_dash_attention_upcoming_assignment");
      default:
        return tr("student_dash_attention_incomplete_lessons");
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-col rounded-2xl border border-border/80 bg-muted/20 p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/12 text-amber-700">
          <BellRing className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h2 className="font-display text-base font-semibold text-foreground sm:text-lg">
          {tr("student_dash_needs_attention")}
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr("student_dash_no_urgent_tasks")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = KIND_ICONS[item.kind];
            return (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex min-w-0 items-start gap-2.5 rounded-xl border border-border/70 bg-card p-2.5 transition-colors hover:border-primary/25 hover:bg-background",
                  )}
                >
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {kindLabel(item.kind)}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-medium text-foreground">
                      {item.kind === "incomplete_lessons" && item.remainingLessons !== undefined
                        ? trf("student_dash_incomplete_lessons_count", {
                            count: String(item.remainingLessons),
                          })
                        : item.title
                          ? bi(item.title)
                          : ""}
                    </p>
                    {item.dueDate ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDue(item.dueDate)}</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
