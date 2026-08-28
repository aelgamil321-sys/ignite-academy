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

const ACTIONS = [
  {
    to: "/teacher/assignments",
    icon: GraduationCap,
    labelKey: "teacher_dash_action_add_assignment",
    accent: "bg-primary/10 text-primary",
  },
  {
    to: "/teacher/quizzes/manage",
    icon: ClipboardCheck,
    labelKey: "teacher_dash_action_create_quiz",
    accent: "bg-brand-dark/10 text-brand-dark",
  },
  {
    to: "/teacher/lessons",
    icon: BookOpen,
    labelKey: "teacher_dash_action_manage_lessons",
    accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  {
    to: "/teacher/announcements/new",
    icon: Megaphone,
    labelKey: "teacher_dash_action_create_announcement",
    accent: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  {
    to: "/teacher/weekly-planning/new",
    icon: CalendarDays,
    labelKey: "teacher_dash_action_weekly_planning",
    accent: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  {
    to: "/teacher/resources",
    icon: Folder,
    labelKey: "teacher_dash_action_resources",
    accent: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
] as const;

export function TeacherQuickActions() {
  const { tr } = useI18n();

  return (
    <TeacherDashboardSection title={tr("teacher_home_quick_actions")}>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.to}
              to={action.to}
              className="group flex min-h-11 min-w-0 items-start gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-muted/30 sm:p-3.5"
            >
              <span
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${action.accent}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 pt-1 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                {tr(action.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </TeacherDashboardSection>
  );
}
