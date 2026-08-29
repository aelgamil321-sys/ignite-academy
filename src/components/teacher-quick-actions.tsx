import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Folder,
  GraduationCap,
  Megaphone,
} from "lucide-react";
import { TeacherDashboardSection } from "@/components/teacher-dashboard-section";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    to: "/teacher/assignments",
    search: { mode: "create" },
    icon: GraduationCap,
    labelKey: "teacher_dash_action_add_assignment",
  },
  {
    to: "/teacher/quizzes/new",
    icon: ClipboardCheck,
    labelKey: "teacher_dash_action_create_quiz",
  },
  {
    to: "/teacher/lessons",
    icon: BookOpen,
    labelKey: "teacher_dash_action_manage_lessons",
  },
  {
    to: "/teacher/announcements/new",
    icon: Megaphone,
    labelKey: "teacher_dash_action_create_announcement",
  },
  {
    to: "/teacher/weekly-planning/new",
    icon: CalendarDays,
    labelKey: "teacher_dash_action_weekly_planning",
  },
  {
    to: "/teacher/resources",
    icon: Folder,
    labelKey: "teacher_dash_action_resources",
  },
] as const;

type TeacherQuickActionsProps = {
  variant?: "card" | "navy";
};

export function TeacherQuickActions({ variant = "card" }: TeacherQuickActionsProps) {
  const { tr } = useI18n();

  const grid = (
    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
            <Link
              key={action.labelKey}
              to={action.to}
              search={"search" in action ? action.search : {}}
            className={cn(
              "group flex min-h-11 min-w-0 items-start gap-2.5 rounded-xl p-2.5 transition-colors sm:p-3",
              variant === "navy"
                ? "border border-white/10 bg-white/5 hover:border-primary/40 hover:bg-white/10"
                : "border border-border bg-background hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <span
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                variant === "navy"
                  ? "bg-primary/20 text-primary"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span
              className={cn(
                "min-w-0 pt-0.5 text-xs font-semibold leading-snug sm:text-sm",
                variant === "navy"
                  ? "text-white group-hover:text-primary"
                  : "text-foreground group-hover:text-primary",
              )}
            >
              {tr(action.labelKey)}
            </span>
          </Link>
        );
      })}
    </div>
  );

  if (variant === "navy") {
    return (
      <section className="flex h-full min-w-0 flex-col rounded-2xl border border-brand-dark/20 bg-brand-dark p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <h3 className="mb-3 font-display text-base text-primary sm:text-lg">{tr("teacher_home_quick_actions")}</h3>
        {grid}
      </section>
    );
  }

  return <TeacherDashboardSection title={tr("teacher_home_quick_actions")}>{grid}</TeacherDashboardSection>;
}
