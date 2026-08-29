import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChartBar,
  ClipboardCheck,
  FileText,
  Folder,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Newspaper,
  Plus,
  School,
  Upload,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
  exact?: boolean;
  search?: Record<string, string>;
  activeMatch?: (pathname: string) => boolean;
};

type NavGroup = {
  titleKey: string;
  items: NavItem[];
};

const OVERVIEW: NavItem[] = [
  { to: "/teacher", icon: LayoutDashboard, labelKey: "teacher_nav_overview", exact: true },
];

const MY_SCOPE: NavItem[] = [
  { to: "/teacher/classes", icon: School, labelKey: "teacher_nav_classes" },
  {
    to: "/teacher/students",
    icon: Users,
    labelKey: "teacher_nav_students",
    activeMatch: (p) => p.startsWith("/teacher/students"),
  },
  { to: "/teacher/users", icon: Users, labelKey: "teacher_nav_parents" },
];

const CONTENT: NavItem[] = [
  { to: "/teacher/lessons/new", icon: Plus, labelKey: "teacher_nav_add_lesson" },
  {
    to: "/teacher/lessons",
    icon: BookOpen,
    labelKey: "teacher_nav_manage_lessons",
    activeMatch: (p) => p === "/teacher/lessons" || p.startsWith("/teacher/lessons/edit"),
  },
  { to: "/teacher/articles/new", icon: Plus, labelKey: "teacher_nav_add_article" },
  {
    to: "/teacher/articles",
    icon: Newspaper,
    labelKey: "teacher_nav_manage_articles",
    activeMatch: (p) => p === "/teacher/articles",
  },
  { to: "/teacher/videos/new", icon: Plus, labelKey: "teacher_nav_add_video" },
  {
    to: "/teacher/videos",
    icon: Video,
    labelKey: "teacher_nav_manage_videos",
    activeMatch: (p) => p === "/teacher/videos",
  },
  { to: "/teacher/resources/new", icon: Upload, labelKey: "teacher_nav_upload_file" },
  {
    to: "/teacher/resources",
    icon: Folder,
    labelKey: "teacher_nav_manage_resources",
    activeMatch: (p) => p.startsWith("/teacher/resources"),
  },
];

const ASSESSMENT: NavItem[] = [
  {
    to: "/teacher/quizzes/new",
    icon: Plus,
    labelKey: "teacher_nav_add_quiz",
    activeMatch: (p) => p === "/teacher/quizzes/new",
  },
  {
    to: "/teacher/quizzes/manage",
    icon: ClipboardCheck,
    labelKey: "teacher_nav_manage_quizzes",
    activeMatch: (p) => p === "/teacher/quizzes/manage",
  },
  {
    to: "/teacher/assignments",
    icon: GraduationCap,
    labelKey: "teacher_nav_assignments",
    exact: true,
  },
  {
    to: "/teacher/assignments",
    icon: Plus,
    labelKey: "teacher_nav_add_assignment",
    search: { mode: "create" },
  },
  {
    to: "/teacher/assignments/submissions",
    icon: FileText,
    labelKey: "teacher_nav_manage_assignments",
    activeMatch: (p) => p === "/teacher/assignments/submissions",
  },
  {
    to: "/teacher/quizzes",
    icon: ClipboardCheck,
    labelKey: "teacher_nav_quizzes",
    exact: true,
  },
  { to: "/teacher/performance", icon: ChartBar, labelKey: "teacher_nav_performance" },
];

const ACADEMIC: NavItem[] = [
  { to: "/teacher/weekly-planning/new", icon: Plus, labelKey: "teacher_nav_add_weekly_plan" },
  {
    to: "/teacher/weekly-planning",
    icon: CalendarDays,
    labelKey: "teacher_nav_weekly_planning",
    activeMatch: (p) =>
      p.startsWith("/teacher/weekly-planning") &&
      p !== "/teacher/weekly-planning/new" &&
      !p.includes("/dashboard") &&
      !p.includes("/review/") &&
      !p.endsWith("/print"),
  },
  { to: "/teacher/units", icon: Layers, labelKey: "teacher_nav_manage_units" },
  { to: "/teacher/curriculum", icon: BookOpen, labelKey: "teacher_nav_curriculum" },
  { to: "/teacher/announcements/new", icon: Plus, labelKey: "teacher_nav_add_announcement" },
  {
    to: "/teacher/announcements",
    icon: Megaphone,
    labelKey: "teacher_nav_manage_announcements",
    activeMatch: (p) => p.startsWith("/teacher/announcements") && p !== "/teacher/announcements/new",
  },
  { to: "/teacher/timetable", icon: Plus, labelKey: "teacher_nav_add_timetable" },
  {
    to: "/teacher/timetable/edit",
    icon: CalendarDays,
    labelKey: "teacher_nav_edit_timetable",
    activeMatch: (p) => p.startsWith("/teacher/timetable/edit"),
  },
  { to: "/teacher/reports", icon: BarChart3, labelKey: "teacher_nav_reports" },
];

const LEAD_WEEKLY: NavItem[] = [
  {
    to: "/teacher/weekly-planning/dashboard",
    icon: ChartBar,
    labelKey: "wp_dept_dashboard_nav",
    activeMatch: (p) =>
      p.startsWith("/teacher/weekly-planning/dashboard") || p.includes("/weekly-planning/review/"),
  },
];

const PROFILE: NavItem[] = [
  { to: "/teacher/profile", icon: User, labelKey: "teacher_profile_title" },
];

function NavLinkItem({
  item,
  pathname,
  tr,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  tr: (key: string) => string;
  onNavigate?: () => void;
}) {
  const active = item.activeMatch
    ? item.activeMatch(pathname)
    : item.exact
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`);

  return (
    <Link
      to={item.to}
      search={item.search ?? {}}
      onClick={onNavigate}
      className={cn(
        "flex min-h-[2.375rem] items-center gap-2 rounded-lg px-2 py-1.5 text-[0.875rem] font-medium leading-snug transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-white/80 hover:bg-white/8 hover:text-white",
      )}
    >
      <item.icon
        className={cn("h-[1.125rem] w-[1.125rem] shrink-0", active ? "text-primary" : "text-white/70")}
      />
      <span className="min-w-0 text-start">{tr(item.labelKey)}</span>
    </Link>
  );
}

function NavSection({
  titleKey,
  items,
  pathname,
  tr,
  onNavigate,
}: {
  titleKey: string;
  items: NavItem[];
  pathname: string;
  tr: (key: string) => string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-0.5">
      <p className="px-2 pb-0.5 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/45 first:pt-0">
        {tr(titleKey)}
      </p>
      {items.map((item) => (
        <NavLinkItem
          key={`${item.to}-${item.labelKey}`}
          item={item}
          pathname={pathname}
          tr={tr}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function SidebarHeader({ tr }: { tr: (key: string) => string }) {
  return (
    <div className="shrink-0 border-b border-white/10 px-2.5 py-2.5">
      <p className="font-display text-[0.8125rem] font-semibold text-primary">{tr("teacher_title")}</p>
      <p className="text-[10px] leading-snug text-white/55">{tr("teacher_dash_nav_brand")}</p>
    </div>
  );
}

function SidebarNav({
  isLeadTeacher,
  tr,
  onNavigate,
}: {
  isLeadTeacher: boolean;
  tr: (key: string) => string;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const groups: NavGroup[] = [
    { titleKey: "teacher_sidebar_overview", items: OVERVIEW },
    { titleKey: "teacher_sidebar_scope", items: MY_SCOPE },
    { titleKey: "teacher_sidebar_content", items: CONTENT },
    { titleKey: "teacher_sidebar_assessment", items: ASSESSMENT },
    { titleKey: "teacher_sidebar_academic", items: ACADEMIC },
    { titleKey: "teacher_sidebar_profile", items: PROFILE },
  ];

  return (
    <nav className="px-1 py-1.5">
      {groups.map((group) => (
        <NavSection
          key={group.titleKey}
          titleKey={group.titleKey}
          items={group.items}
          pathname={pathname}
          tr={tr}
          onNavigate={onNavigate}
        />
      ))}
      {isLeadTeacher ? (
        <NavSection
          titleKey="wp_dept_nav_section"
          items={LEAD_WEEKLY}
          pathname={pathname}
          tr={tr}
          onNavigate={onNavigate}
        />
      ) : null}
    </nav>
  );
}

function SidebarFooter({
  email,
  teacherName,
  tr,
}: {
  email: string;
  teacherName: string;
  tr: (key: string) => string;
}) {
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.assign("/auth?mode=login");
  };

  return (
    <div className="shrink-0 border-t border-white/10 px-2 py-2">
      <div className="min-w-0 px-1">
        <p className="truncate text-[0.8125rem] font-medium text-white">{teacherName}</p>
        <p className="truncate text-[11px] text-white/55">{email}</p>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-1.5 flex min-h-[2.375rem] w-full items-center gap-2 rounded-lg px-2 text-[0.875rem] font-medium text-white/75 transition-colors hover:bg-white/8 hover:text-white"
      >
        <LogOut className="h-[1.125rem] w-[1.125rem] shrink-0" />
        {tr("teacher_sign_out")}
      </button>
    </div>
  );
}

export function TeacherSidebar({
  email,
  teacherName,
  isLeadTeacher = false,
  mobileOpen = false,
  onMobileOpenChange,
}: {
  email: string;
  teacherName: string;
  isLeadTeacher?: boolean;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}) {
  const { tr, dir } = useI18n();
  const closeMobile = () => onMobileOpenChange?.(false);

  return (
    <>
      <aside className="hidden w-[14.5rem] shrink-0 flex-col bg-brand-dark text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <SidebarHeader tr={tr} />
        <div className="teacher-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SidebarNav isLeadTeacher={isLeadTeacher} tr={tr} />
        </div>
        <SidebarFooter email={email} teacherName={teacherName} tr={tr} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label={tr("wp_preview_close")}
            onClick={closeMobile}
          />
          <aside
            className={cn(
              "absolute top-0 flex h-full w-[min(17rem,88vw)] flex-col bg-brand-dark text-white shadow-2xl",
              dir === "rtl" ? "end-0" : "start-0",
            )}
          >
            <div className="flex shrink-0 items-center justify-end border-b border-white/10 px-2 py-1">
              <button
                type="button"
                onClick={closeMobile}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
                aria-label={tr("wp_preview_close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="teacher-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <SidebarHeader tr={tr} />
              <SidebarNav isLeadTeacher={isLeadTeacher} tr={tr} onNavigate={closeMobile} />
            </div>
            <SidebarFooter email={email} teacherName={teacherName} tr={tr} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
