import { GraduationCap, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ParentLinkedChild } from "@/lib/parent-children";
import { gradeDisplayName } from "@/lib/grade-utils";

const L = (en: string, ar: string) => ({ en, ar });

export function ParentChildSelector({
  linkedChildren,
  selectedStudentUserId,
  onSelect,
}: {
  linkedChildren: ParentLinkedChild[];
  selectedStudentUserId: string;
  onSelect: (studentUserId: string) => void;
}) {
  const { lang } = useI18n();

  if (linkedChildren.length <= 1) {
    return null;
  }

  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-[var(--shadow-soft)]"
      aria-label={L("Select child", "اختر الطفل")[locale]}
    >
      <div className="text-xs uppercase tracking-[0.2em] text-primary mb-3">
        {L("Your children", "أبناؤك")[locale]}
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={L("Linked children", "الأبناء المرتبطون")[locale]}>
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
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              <UserRound className="h-4 w-4 shrink-0" />
              <span>{child.studentName[locale] || child.studentName.en}</span>
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
