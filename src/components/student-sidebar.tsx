import { Link, useRouterState } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Trophy,
  User,
  Video,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useStudentShell } from "@/lib/student-shell-context";
import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  to?: string;
  hash?: string;
  exact?: boolean;
  disabled?: boolean;
  disabledTitleKey?: string;
  activeMatch?: (pathname: string, hash: string) => boolean;
};

function NavLinkItem({
  item,
  pathname,
  hash,
  tr,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  hash: string;
  tr: (key: string) => string;
  onNavigate?: () => void;
}) {
  const normalizedHash = hash.replace(/^#/, "");

  const active = item.activeMatch
    ? item.activeMatch(pathname, normalizedHash)
    : item.to
      ? item.exact
        ? pathname === item.to && (!item.hash || normalizedHash === item.hash)
        : pathname === item.to || pathname.startsWith(`${item.to}/`)
      : false;

  const className = cn(
    "flex min-h-[2.375rem] items-center gap-2 rounded-lg px-2 text-[0.875rem] font-medium transition-colors",
    active
      ? "bg-primary/15 text-primary"
      : item.disabled
        ? "cursor-not-allowed text-white/35"
        : "text-white/80 hover:bg-white/8 hover:text-white",
  );

  const content = (
    <>
      <item.icon
        className={cn("h-[1.125rem] w-[1.125rem] shrink-0", active ? "text-primary" : "text-white/70")}
      />
      <span className="min-w-0 text-start">{tr(item.labelKey)}</span>
    </>
  );

  if (item.disabled || !item.to) {
    return (
      <span
        className={className}
        title={item.disabledTitleKey ? tr(item.disabledTitleKey) : undefined}
        aria-disabled="true"
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      to={item.to}
      hash={item.hash}
      onClick={onNavigate}
      className={className}
      title={item.disabledTitleKey ? tr(item.disabledTitleKey) : undefined}
    >
      {content}
    </Link>
  );
}

function SidebarHeader({ tr }: { tr: (key: string) => string }) {
  return (
    <div className="shrink-0 border-b border-white/10 px-2.5 py-2.5">
      <p className="font-display text-[0.8125rem] font-semibold text-primary">{tr("student_nav_dashboard")}</p>
      <p className="text-[10px] leading-snug text-white/55">{tr("student_dash_nav_brand")}</p>
    </div>
  );
}

function SidebarNav({
  items,
  tr,
  onNavigate,
}: {
  items: NavItem[];
  tr: (key: string) => string;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hash = useRouterState({ select: (s) => s.location.hash });

  return (
    <nav className="space-y-0.5 px-1 py-1.5">
      {items.map((item) => (
        <NavLinkItem
          key={item.key}
          item={item}
          pathname={pathname}
          hash={hash}
          tr={tr}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function SidebarFooter({
  displayName,
  email,
  tr,
}: {
  displayName: string;
  email: string;
  tr: (key: string) => string;
}) {
  const logout = async () => {
    await supabase.auth.signOut();
    window.location.assign("/auth?mode=login");
  };

  return (
    <div className="shrink-0 border-t border-white/10 px-2 py-2">
      <div className="min-w-0 px-1">
        <p className="truncate text-[0.8125rem] font-medium text-white">{displayName}</p>
        <p className="truncate text-[11px] text-white/55">{email}</p>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        className="mt-1.5 flex min-h-[2.375rem] w-full items-center gap-2 rounded-lg px-2 text-[0.875rem] font-medium text-white/75 transition-colors hover:bg-white/8 hover:text-white"
      >
        <LogOut className="h-[1.125rem] w-[1.125rem] shrink-0" />
        {tr("student_sign_out")}
      </button>
    </div>
  );
}

export function StudentSidebar({
  mobileOpen = false,
  onMobileOpenChange,
}: {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}) {
  const { tr, dir } = useI18n();
  const { displayName, email, gradeSlug, hasGrade } = useStudentShell();
  const closeMobile = () => onMobileOpenChange?.(false);

  const myLessonsTo = hasGrade ? `/grades/${gradeSlug}` : "/student/profile";
  const myQuizzesTo = myLessonsTo;

  const navItems: NavItem[] = [
    {
      key: "dashboard",
      labelKey: "student_nav_dashboard",
      icon: LayoutDashboard,
      to: "/student",
      exact: true,
      activeMatch: (pathname, hash) =>
        (pathname === "/student" || pathname === "/student/") && hash !== "student-achievements",
    },
    {
      key: "lessons",
      labelKey: "student_nav_my_lessons",
      icon: BookOpen,
      to: myLessonsTo,
      disabledTitleKey: !hasGrade ? "student_my_lessons_complete_profile" : undefined,
      activeMatch: (pathname) => hasGrade && pathname.startsWith(`/grades/${gradeSlug}`),
    },
    {
      key: "assignments",
      labelKey: "student_nav_assignments",
      icon: ClipboardCheck,
      to: "/assignments",
    },
    {
      key: "quizzes",
      labelKey: "student_nav_quizzes",
      icon: FileText,
      to: myQuizzesTo,
      disabledTitleKey: !hasGrade ? "student_my_lessons_complete_profile" : undefined,
      activeMatch: (pathname) => hasGrade && pathname.startsWith(`/grades/${gradeSlug}`),
    },
    {
      key: "resources",
      labelKey: "student_nav_resources",
      icon: BookOpen,
      to: "/resources",
    },
    {
      key: "videos",
      labelKey: "student_nav_videos",
      icon: Video,
      to: "/videos",
    },
    {
      key: "achievements",
      labelKey: "student_nav_achievements",
      icon: Award,
      to: "/student",
      hash: "student-achievements",
      activeMatch: (_pathname, hash) => hash === "student-achievements",
    },
    {
      key: "honor",
      labelKey: "student_nav_honor_board",
      icon: Trophy,
      to: "/hall-of-fame",
    },
    {
      key: "announcements",
      labelKey: "student_nav_announcements",
      icon: Megaphone,
      to: "/announcements",
    },
    {
      key: "profile",
      labelKey: "student_nav_profile",
      icon: User,
      to: "/student/profile",
    },
  ];

  return (
    <>
      <aside className="hidden w-[14.5rem] shrink-0 flex-col bg-brand-dark text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <SidebarHeader tr={tr} />
        <div className="teacher-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SidebarNav items={navItems} tr={tr} />
        </div>
        <SidebarFooter displayName={displayName} email={email} tr={tr} />
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
              <SidebarNav items={navItems} tr={tr} onNavigate={closeMobile} />
            </div>
            <SidebarFooter displayName={displayName} email={email} tr={tr} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
