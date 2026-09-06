import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSelector } from "@/components/language-selector";
import { SafeNotificationBell } from "@/components/notification-bell";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { certificateIslamicLogoUrl, certificateSchoolLogoUrl } from "@/lib/certificate-branding";
import { profileInitials } from "@/lib/admin-profile";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AdminTab } from "@/components/admin-sidebar";

type NavLink = {
  key: string;
  labelKey: string;
  to: string;
  search?: Record<string, string>;
  matchPrefix?: string;
};

const HOME_LINK: NavLink = {
  key: "home",
  labelKey: "admin_nav_home",
  to: "/admin",
  search: { tab: "overview" },
};

const CONTENT_LINK: NavLink = {
  key: "content",
  labelKey: "admin_nav_content",
  to: "/admin/content",
  matchPrefix: "/admin/content",
};

const ANALYTICS_LINK: NavLink = {
  key: "analytics",
  labelKey: "admin_nav_analytics",
  to: "/admin/analytics",
  matchPrefix: "/admin/analytics",
};

const MAIN_NAV: NavLink[] = [HOME_LINK, CONTENT_LINK, ANALYTICS_LINK];

const TEACHING_NAV: NavLink[] = [
  { key: "grades", labelKey: "admin_nav_grades", to: "/admin/grades", matchPrefix: "/admin/grades" },
  {
    key: "assignments",
    labelKey: "admin_nav_assignments",
    to: "/admin/assignments",
    matchPrefix: "/admin/assignments",
  },
  {
    key: "quiz_submissions",
    labelKey: "admin_nav_quiz_submissions",
    to: "/admin/quiz-submissions",
    matchPrefix: "/admin/quiz-submissions",
  },
  {
    key: "weekly_planning",
    labelKey: "admin_nav_weekly_planning",
    to: "/admin/weekly-planning/dashboard",
    matchPrefix: "/admin/weekly-planning",
  },
];

const MANAGEMENT_NAV: NavLink[] = [
  { key: "students", labelKey: "admin_nav_students", to: "/admin/students", matchPrefix: "/admin/students" },
  { key: "teachers", labelKey: "admin_nav_teachers", to: "/admin/teachers", matchPrefix: "/admin/teachers" },
  { key: "parents", labelKey: "admin_nav_parents", to: "/admin/parents", matchPrefix: "/admin/parents" },
  {
    key: "honor_board",
    labelKey: "admin_nav_honor_board",
    to: "/admin/honor-board",
    matchPrefix: "/admin/honor-board",
  },
];

const CMS_CREATE_NAV: NavLink[] = [
  { key: "new-lesson", labelKey: "admin_content_add_lesson", to: "/admin", search: { tab: "new-lesson" } },
  { key: "new-article", labelKey: "admin_content_add_announcement", to: "/admin", search: { tab: "new-article" } },
  { key: "new-video", labelKey: "admin_content_add_video", to: "/admin", search: { tab: "new-video" } },
  { key: "new-file", labelKey: "admin_content_upload_file", to: "/admin", search: { tab: "new-file" } },
];

const CMS_MANAGE_NAV: NavLink[] = [
  {
    key: "manage-resources",
    labelKey: "admin_content_manage_resources",
    to: "/admin",
    search: { tab: "manage-resources" },
  },
  {
    key: "manage-lessons",
    labelKey: "admin_content_manage_lessons",
    to: "/admin/lessons",
    matchPrefix: "/admin/lessons",
  },
  {
    key: "manage-grades",
    labelKey: "admin_cms_manage_grades",
    to: "/admin",
    search: { tab: "manage-grades" },
  },
  {
    key: "manage-units",
    labelKey: "admin_cms_manage_units",
    to: "/admin",
    search: { tab: "manage-units" },
  },
  {
    key: "manage-quizzes",
    labelKey: "admin_content_manage_quizzes",
    to: "/admin",
    search: { tab: "manage-quizzes" },
  },
  {
    key: "manage-announcements",
    labelKey: "admin_content_manage_announcements",
    to: "/admin",
    search: { tab: "manage-announcements" },
  },
  {
    key: "manage-users",
    labelKey: "admin_cms_manage_users",
    to: "/admin",
    search: { tab: "manage-users" },
  },
  {
    key: "manage-parent-links",
    labelKey: "admin_cms_parent_links",
    to: "/admin",
    search: { tab: "manage-parent-links" },
  },
];

function isNavActive(
  pathname: string,
  searchTab: string | undefined,
  item: NavLink,
): boolean {
  if (item.matchPrefix && pathname.startsWith(item.matchPrefix)) return true;
  if (item.key === "content" && pathname.startsWith("/admin/lessons")) return true;
  if (item.search?.tab) {
    return pathname === "/admin" && searchTab === item.search.tab;
  }
  if (item.key === "home") {
    return pathname === "/admin" && (searchTab === "overview" || searchTab === undefined);
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function navButtonClass(active: boolean) {
  return cn(
    "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-white hover:bg-white/12 hover:text-white",
  );
}

function NavMenuLink({
  item,
  pathname,
  searchTab,
  onNavigate,
  className,
}: {
  item: NavLink;
  pathname: string;
  searchTab: string | undefined;
  onNavigate?: () => void;
  className?: string;
}) {
  const { tr } = useI18n();
  const active = isNavActive(pathname, searchTab, item);
  return (
    <Link
      to={item.to}
      search={item.search ?? {}}
      onClick={onNavigate}
      className={cn(navButtonClass(active), className)}
    >
      {tr(item.labelKey)}
    </Link>
  );
}

function NavDropdown({
  labelKey,
  items,
  pathname,
  searchTab,
  onNavigate,
}: {
  labelKey: string;
  items: NavLink[];
  pathname: string;
  searchTab: string | undefined;
  onNavigate?: () => void;
}) {
  const { tr } = useI18n();
  const active = items.some((item) => isNavActive(pathname, searchTab, item));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(navButtonClass(active), "gap-1 data-[state=open]:bg-primary data-[state=open]:text-primary-foreground")}>
        {tr(labelKey)}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-90" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[11rem]">
        {items.map((item) => (
          <DropdownMenuItem key={item.key} asChild>
            <Link to={item.to} search={item.search ?? {}} onClick={onNavigate}>
              {tr(item.labelKey)}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminTopBar({
  profile,
  onLogout,
}: {
  profile: {
    fullName: string;
    email: string;
    profilePhotoPath: string | null;
  };
  onLogout: () => void;
}) {
  const { tr } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const searchTab = typeof search.tab === "string" ? (search.tab as AdminTab) : undefined;

  const schoolLogoUrl = certificateSchoolLogoUrl();
  const islamicLogoUrl = certificateIslamicLogoUrl();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#2f3542] text-white shadow-md">
      <div className="container-page flex min-h-[3.25rem] min-w-0 items-center gap-2 py-2 sm:gap-3">
        <Link
          to="/admin"
          search={{ tab: "overview" }}
          className="flex shrink-0 items-center gap-2 min-w-0"
        >
          <BrandLogo src={schoolLogoUrl} alt={tr("school_logo_alt")} size="headerCompact" className="hidden sm:flex" />
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground sm:hidden">
            <BookOpen className="h-4 w-4" />
          </div>
          <div className="min-w-0 hidden md:block">
            <div className="font-display text-sm font-semibold leading-tight text-white truncate">
              {tr("brand_name")}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-white/70">{tr("admin_nav_brand")}</div>
          </div>
        </Link>

        <nav className="hidden lg:flex flex-1 items-center justify-center gap-1 min-w-0">
          {MAIN_NAV.map((item) => (
            <NavMenuLink key={item.key} item={item} pathname={pathname} searchTab={searchTab} />
          ))}
          <NavDropdown
            labelKey="admin_nav_teaching"
            items={TEACHING_NAV}
            pathname={pathname}
            searchTab={searchTab}
          />
          <NavDropdown
            labelKey="admin_nav_management"
            items={MANAGEMENT_NAV}
            pathname={pathname}
            searchTab={searchTab}
          />
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5 ms-auto">
          <BrandLogo
            src={islamicLogoUrl}
            alt={tr("dept_islamic_ed")}
            size="headerCompact"
            className="hidden xl:flex opacity-95"
          />
          <SafeNotificationBell className="h-10 w-10 border-white/20 bg-white/10 text-white hover:border-primary/50 hover:text-primary" />
          <LanguageSelector className="h-10 border-white/20 bg-white/10 text-white hover:border-primary/50 hover:text-primary" />
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex min-h-10 max-w-[10.5rem] items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-left hover:bg-white/10 transition-colors"
            >
              {profile.profilePhotoPath ? (
                <StudentProfileAvatar
                  profilePhotoPath={profile.profilePhotoPath}
                  alt={profile.fullName}
                  className="h-8 w-8 rounded-md"
                  fallbackClassName="rounded-md text-xs"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
                  {profileInitials(profile.fullName)}
                </div>
              )}
              <div className="min-w-0 hidden sm:block">
                <div className="truncate text-xs font-semibold text-white">{profile.fullName}</div>
                <div className="truncate text-[10px] text-white/70">{tr("admin_role_label")}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/80 hidden sm:block" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[14rem]">
              <DropdownMenuLabel className="font-normal">
                <div className="font-semibold text-foreground">{profile.fullName}</div>
                <div className="text-xs text-muted-foreground">{profile.email}</div>
                <div className="text-xs text-primary mt-1">{tr("admin_role_label")}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 me-2" />
                {tr("nav_logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            aria-label={tr("aria_toggle_admin_menu")}
            className="inline-flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/20 text-white lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="lg:hidden border-t border-white/10 bg-[#2f3542]">
          <div className="container-page py-3 space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1">
              <p className="px-2 text-[10px] uppercase tracking-wider text-white/55">{tr("admin_nav_group_main")}</p>
              {MAIN_NAV.map((item) => (
                <NavMenuLink
                  key={item.key}
                  item={item}
                  pathname={pathname}
                  searchTab={searchTab}
                  onNavigate={() => setMobileOpen(false)}
                  className="w-full min-h-11 justify-start"
                />
              ))}
            </div>
            <div className="space-y-1">
              <p className="px-2 text-[10px] uppercase tracking-wider text-white/55">{tr("admin_nav_group_teaching")}</p>
              {TEACHING_NAV.map((item) => (
                <NavMenuLink
                  key={item.key}
                  item={item}
                  pathname={pathname}
                  searchTab={searchTab}
                  onNavigate={() => setMobileOpen(false)}
                  className="w-full min-h-11 justify-start"
                />
              ))}
            </div>
            <div className="space-y-1">
              <p className="px-2 text-[10px] uppercase tracking-wider text-white/55">{tr("admin_nav_group_management")}</p>
              {MANAGEMENT_NAV.map((item) => (
                <NavMenuLink
                  key={item.key}
                  item={item}
                  pathname={pathname}
                  searchTab={searchTab}
                  onNavigate={() => setMobileOpen(false)}
                  className="w-full min-h-11 justify-start"
                />
              ))}
            </div>
            <div className="space-y-1">
              <p className="px-2 text-[10px] uppercase tracking-wider text-white/55">{tr("admin_nav_group_cms")}</p>
              {CMS_CREATE_NAV.map((item) => (
                <NavMenuLink
                  key={item.key}
                  item={item}
                  pathname={pathname}
                  searchTab={searchTab}
                  onNavigate={() => setMobileOpen(false)}
                  className="w-full min-h-11 justify-start"
                />
              ))}
              {CMS_MANAGE_NAV.map((item) => (
                <NavMenuLink
                  key={item.key}
                  item={item}
                  pathname={pathname}
                  searchTab={searchTab}
                  onNavigate={() => setMobileOpen(false)}
                  className="w-full min-h-11 justify-start"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onLogout();
              }}
              className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-red-300 hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              {tr("nav_logout")}
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
