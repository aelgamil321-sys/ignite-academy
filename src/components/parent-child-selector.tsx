import { GraduationCap, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ParentLinkedChild } from "@/lib/parent-children";
import { gradeDisplayName } from "@/lib/grade-utils";

export function ParentChildSelector({
  linkedChildren,
  selectedStudentUserId,
  onSelect,
  variant = "default",
}: {
  linkedChildren: ParentLinkedChild[];
  selectedStudentUserId: string;
  onSelect: (studentUserId: string) => void;
  variant?: "default" | "compact";
}) {
  const { lang, bi, tr } = useI18n();

  if (linkedChildren.length <= 1) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div role="tablist" aria-label={tr("parent_select_child")}>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/55">
          {tr("parent_your_children")}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {linkedChildren.map((child) => {
            const active = child.studentUserId === selectedStudentUserId;
            const gradeName = gradeDisplayName(child.gradeSlug, lang) || child.gradeSlug;
            return (
              <button
                key={child.studentUserId}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(child.studentUserId)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/20 bg-white/5 text-white/85 hover:border-primary/50"
                }`}
              >
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <span>{bi(child.studentName) || child.studentName.en}</span>
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? "bg-primary-foreground/15" : "bg-white/10"
                  }`}
                >
                  <GraduationCap className="h-2.5 w-2.5" />
                  {gradeName}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
      aria-label={tr("parent_select_child")}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-primary mb-3">
        {tr("parent_your_children")}
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={tr("parent_linked_children")}>
        {linkedChildren.map((child) => {
          const active = child.studentUserId === selectedStudentUserId;
          const gradeName = gradeDisplayName(child.gradeSlug, lang) || child.gradeSlug;
          return (
            <button
              key={child.studentUserId}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(child.studentUserId)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              <UserRound className="h-4 w-4 shrink-0" />
              <span>{bi(child.studentName) || child.studentName.en}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                  active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <GraduationCap className="h-3 w-3" />
                {gradeName}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
