import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  ChartBar,
  ClipboardCheck,
  FileText,
  Folder,
  GraduationCap,
  LayoutDashboard,
  Layers,
  ListChecks,
  LogOut,
  Megaphone,
  Newspaper,
  Plus,
  School,
  Upload,
  Users,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
  exact?: boolean;
  activeMatch?: (pathname: string) => boolean;
};

const OVERVIEW: NavItem[] = [
  { to: "/teacher", icon: LayoutDashboard, labelKey: "teacher_nav_overview", exact: true },
];

const MY_SCOPE: NavItem[] = [
  { to: "/teacher/classes", icon: School, labelKey: "teacher_nav_classes" },
  { to: "/teacher/students", icon: Users, labelKey: "teacher_nav_students" },
  { to: "/teacher/users", icon: Users, labelKey: "teacher_nav_parents" },
];

const CONTENT: NavItem[] = [
  {
    to: "/teacher/lessons/new",
    icon: Plus,
    labelKey: "teacher_nav_add_lesson",
    activeMatch: (p) => p === "/teacher/lessons/new",
  },
  {
    to: "/teacher/lessons",
    icon: BookOpen,
    labelKey: "teacher_nav_manage_lessons",
    activeMatch: (p) => p === "/teacher/lessons" || p.startsWith("/teacher/lessons/edit"),
  },
  {
    to: "/teacher/articles/new",
    icon: Plus,
    labelKey: "teacher_nav_add_article",
    activeMatch: (p) => p === "/teacher/articles/new",
  },
  {
    to: "/teacher/articles",
    icon: Newspaper,
    labelKey: "teacher_nav_manage_articles",
    activeMatch: (p) => p === "/teacher/articles",
  },
  {
    to: "/teacher/videos/new",
    icon: Plus,
    labelKey: "teacher_nav_add_video",
    activeMatch: (p) => p === "/teacher/videos/new",
  },
  {
    to: "/teacher/videos",
    icon: Video,
    labelKey: "teacher_nav_manage_videos",
    activeMatch: (p) => p === "/teacher/videos",
  },
  {
    to: "/teacher/resources/new",
    icon: Upload,
    labelKey: "teacher_nav_upload_file",
    activeMatch: (p) => p === "/teacher/resources/new",
  },
  {
    to: "/teacher/resources",
    icon: Folder,
    labelKey: "teacher_nav_manage_resources",
    activeMatch: (p) => p === "/teacher/resources",
  },
];

const ASSESSMENT: NavItem[] = [
  { to: "/teacher/quizzes", icon: ClipboardCheck, labelKey: "teacher_nav_quizzes", exact: true },
  {
    to: "/teacher/quizzes/manage",
    icon: ListChecks,
    labelKey: "teacher_nav_manage_quizzes",
    activeMatch: (p) => p === "/teacher/quizzes/manage",
  },
  {
    to: "/teacher/assignments",
    icon: GraduationCap,
    labelKey: "teacher_nav_assignments",
    activeMatch: (p) => p === "/teacher/assignments",
  },
  {
    to: "/teacher/assignments/submissions",
    icon: FileText,
    labelKey: "teacher_nav_manage_assignments",
    activeMatch: (p) => p === "/teacher/assignments/submissions",
  },
  { to: "/teacher/performance", icon: ChartBar, labelKey: "teacher_nav_performance" },
];

const ACADEMIC: NavItem[] = [
  { to: "/teacher/units", icon: Layers, labelKey: "teacher_nav_manage_units" },
  { to: "/teacher/curriculum", icon: BookOpen, labelKey: "teacher_nav_curriculum" },
  {
    to: "/teacher/announcements/new",
    icon: Plus,
    labelKey: "teacher_nav_add_announcement",
    activeMatch: (p) => p === "/teacher/announcements/new",
  },
  {
    to: "/teacher/announcements",
    icon: Megaphone,
    labelKey: "teacher_nav_manage_announcements",
    activeMatch: (p) => p === "/teacher/announcements",
  },
];

function sideClass(active: boolean) {
  return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted"
  }`;
}

function NavSection({
  title,
  items,
  pathname,
  tr,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  tr: (key: string) => string;
}) {
  return (
    <>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-3 py-2 mt-1">
        {title}
      </div>
      {items.map((item) => {
        const active = item.activeMatch
          ? item.activeMatch(pathname)
          : item.exact
            ? pathname === item.to
            : pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link key={item.to} to={item.to} className={sideClass(active)}>
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="text-start leading-snug">{tr(item.labelKey)}</span>
          </Link>
        );
      })}
    </>
  );
}

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
    <aside className="rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <div className="mb-3 border-b border-border pb-3 px-1">
        <p className="font-display text-lg text-foreground">{teacherName}</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>
      <nav className="space-y-0.5 pb-2">
        <NavSection title={tr("teacher_sidebar_overview")} items={OVERVIEW} pathname={pathname} tr={tr} />
        <NavSection title={tr("teacher_sidebar_scope")} items={MY_SCOPE} pathname={pathname} tr={tr} />
        <NavSection title={tr("teacher_sidebar_content")} items={CONTENT} pathname={pathname} tr={tr} />
        <NavSection title={tr("teacher_sidebar_assessment")} items={ASSESSMENT} pathname={pathname} tr={tr} />
        <NavSection title={tr("teacher_sidebar_academic")} items={ACADEMIC} pathname={pathname} tr={tr} />
      </nav>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" />
        {tr("teacher_sign_out")}
      </button>
    </aside>
  );
}
