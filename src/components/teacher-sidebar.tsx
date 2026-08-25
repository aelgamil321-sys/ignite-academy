import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  ChartBar,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  School,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

const NAV = [
  { to: "/teacher", icon: LayoutDashboard, labelKey: "teacher_nav_overview" as const, exact: true },
  { to: "/teacher/classes", icon: School, labelKey: "teacher_nav_classes" as const },
  { to: "/teacher/students", icon: Users, labelKey: "teacher_nav_students" as const },
  { to: "/teacher/lessons", icon: BookOpen, labelKey: "teacher_nav_lessons" as const },
  { to: "/teacher/quizzes", icon: ClipboardCheck, labelKey: "teacher_nav_quizzes" as const },
  { to: "/teacher/assignments", icon: GraduationCap, labelKey: "teacher_nav_assignments" as const },
  { to: "/teacher/performance", icon: ChartBar, labelKey: "teacher_nav_performance" as const },
];

export function TeacherSidebar({
  email,
  teacherName,
}: {
  email: string;
  teacherName: string;
}) {
  const { tr } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.assign("/auth?mode=login");
  };

  return (
    <aside className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
      <div className="mb-4 border-b border-border pb-4">
        <p className="font-display text-lg text-foreground">{teacherName}</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
      <nav className="space-y-1">
        {NAV.map((item) => {
          const active =
            item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-muted"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {tr(item.labelKey)}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" />
        {tr("teacher_sign_out")}
      </button>
    </aside>
  );
}
