import { Link } from "@tanstack/react-router";
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  School,
  Users,
} from "lucide-react";
import { AdminHomeAnalyticsPreview } from "@/components/admin-home-analytics-preview";
import { useI18n } from "@/lib/i18n";
import { useSchoolManagementPaths } from "@/lib/workspace-paths";

const QUICK_LINKS = [
  { key: "students", icon: GraduationCap, labelKey: "lead_teacher_nav_students" as const },
  { key: "teachers", icon: School, labelKey: "lead_teacher_nav_teachers" as const },
  { key: "parents", icon: Users, labelKey: "lead_teacher_nav_parents" as const },
  { key: "analytics", icon: BarChart3, labelKey: "lead_teacher_nav_analytics" as const },
  { key: "content", icon: BookOpen, labelKey: "lead_teacher_nav_content" as const },
  { key: "honorBoard", icon: Award, labelKey: "lead_teacher_nav_honor_board" as const },
  { key: "grades", icon: LayoutDashboard, labelKey: "lead_teacher_nav_grades" as const },
  { key: "weeklyPlanningDashboard", icon: CalendarDays, labelKey: "wp_dept_dashboard_nav" as const },
] as const;

export function LeadTeacherManagementOverview() {
  const { tr } = useI18n();
  const paths = useSchoolManagementPaths();

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-[var(--shadow-soft)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {tr("lead_teacher_nav_section")}
        </p>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl text-foreground">
          {tr("lead_teacher_overview_title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          {tr("lead_teacher_overview_lead")}
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((item) => {
            const Icon = item.icon;
            const href = paths[item.key];
            return (
              <Link
                key={item.key}
                to={href}
                className="flex min-h-[3rem] items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-start">{tr(item.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <AdminHomeAnalyticsPreview />
    </div>
  );
}
