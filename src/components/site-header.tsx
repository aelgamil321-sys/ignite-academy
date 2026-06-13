import { Link } from "@tanstack/react-router";
import { Menu, X, BookOpen, Languages, User, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAccountRole } from "@/hooks/use-account-role";
import { certificateSchoolLogoUrl } from "@/lib/certificate-branding";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const STUDENT_ONLY_PATHS = new Set(["/grades", "/quizzes", "/student"]);

type SiteHeaderProps = {
  /** Homepage header: school logo top-right. */
  showSchoolLogo?: boolean;
};

export function SiteHeader({ showSchoolLogo = false }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const { tr, toggle, lang } = useI18n();
  const { isParent, loading: roleLoading } = useAccountRole();

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setSignedIn(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const allNav: Array<{ label: string; to: string }> = [
    { label: tr("nav_home"), to: "/" },
    { label: tr("nav_about"), to: "/about" },
    { label: tr("nav_stages"), to: "/grades" },
    { label: tr("nav_resources"), to: "/resources" },
    { label: tr("nav_videos"), to: "/videos" },
    { label: tr("nav_quizzes"), to: "/quizzes" },
    { label: tr("nav_announcements"), to: "/announcements" },
    { label: tr("nav_parent"), to: "/parent" },
    { label: tr("nav_student"), to: "/student" },
    { label: tr("nav_contact"), to: "/contact" },
    { label: lang === "ar" ? "الإدارة" : "Admin", to: "/admin" },
  ];

  const parentNav: Array<{ label: string; to: string }> = [
    { label: tr("nav_home"), to: "/" },
    { label: tr("nav_about"), to: "/about" },
    { label: tr("nav_announcements"), to: "/announcements" },
    { label: tr("nav_parent"), to: "/parent" },
    { label: tr("parent_dashboard_title"), to: "/parent/dashboard" },
    { label: tr("nav_contact"), to: "/contact" },
    { label: lang === "ar" ? "الإدارة" : "Admin", to: "/admin" },
  ];

  const nav = signedIn && isParent ? parentNav : allNav.filter((item) => !signedIn || !isParent || !STUDENT_ONLY_PATHS.has(item.to));
  const desktopNav = signedIn && isParent ? parentNav : allNav.slice(0, 8).filter((item) => !signedIn || !isParent || !STUDENT_ONLY_PATHS.has(item.to));
  const profilePath = signedIn && isParent ? "/parent/settings" : "/student/profile";
  const profileLabel = signedIn && isParent
    ? (lang === "ar" ? "ملف ولي الأمر" : "Parent Profile")
    : (lang === "ar" ? "الملف الشخصي" : "Profile");

  const schoolLogoUrl = certificateSchoolLogoUrl();
  const schoolLogoAlt = lang === "ar" ? "مدرسة اجنايت" : "Ignite School";

  const brandLink = (
    <Link to="/" className="group flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)] sm:h-11 sm:w-11">
        <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      {!showSchoolLogo && (
        <div className="min-w-0 leading-tight">
          <div className="truncate font-display text-base font-semibold text-foreground sm:text-lg">
            {tr("brand_name")}
          </div>
          <div className="truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">
            {tr("brand_org")}
          </div>
        </div>
      )}
    </Link>
  );

  const homeIconLink = (
    <Link
      to="/"
      aria-label={tr("brand_name")}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 sm:h-11 sm:w-11"
    >
      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
    </Link>
  );

  const schoolLogoDesktop = (
    <BrandLogo src={schoolLogoUrl} alt={schoolLogoAlt} size="header" className="hidden lg:flex" />
  );

  const schoolLogoTablet = (
    <BrandLogo src={schoolLogoUrl} alt={schoolLogoAlt} size="headerCompact" className="hidden md:flex lg:hidden" />
  );

  const authButtons = (compact?: boolean) => (
    <>
      {signedIn && isParent && (
        <Link
          to="/parent/dashboard"
          className="hidden md:inline-flex items-center gap-1.5 justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-[var(--shadow-soft)]"
        >
          <LayoutDashboard className="h-4 w-4" />
          {!compact && tr("parent_dashboard_title")}
        </Link>
      )}
      {signedIn ? (
        <Link
          to={profilePath}
          className="hidden md:inline-flex items-center gap-1.5 justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <User className="h-4 w-4" />
          {!compact && profileLabel}
        </Link>
      ) : (
        <a
          href="/auth?mode=login"
          onClick={(e) => {
            e.preventDefault();
            window.location.assign("/auth?mode=login");
          }}
          className="hidden md:inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-[var(--shadow-soft)]"
        >
          {tr("nav_login")}
        </a>
      )}
    </>
  );

  const langButton = (
    <button
      onClick={toggle}
      aria-label="Toggle language"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary sm:px-3"
    >
      <Languages className="h-4 w-4" />
      <span className="hidden sm:inline">{lang === "en" ? "العربية" : "English"}</span>
    </button>
  );

  const menuButton = (
    <button
      aria-label="Toggle menu"
      onClick={() => setOpen((o) => !o)}
      className="xl:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-muted"
    >
      {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );

  const desktopNavEl = (
    <nav className="hidden xl:flex items-center justify-center gap-0.5">
      {!roleLoading && desktopNav.map((item) => (
        <Link
          key={item.to + item.label}
          to={item.to}
          activeOptions={{ exact: item.to === "/" }}
          activeProps={{ className: "text-primary" }}
          className="px-2.5 py-2 text-[13px] font-medium text-foreground/80 transition-colors rounded-md hover:text-primary"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-lg">
      <div
        className={cn(
          "container-page",
          showSchoolLogo ? "py-3.5 md:py-4 lg:py-5" : "flex min-h-[4.5rem] items-center justify-between py-4",
        )}
      >
        {showSchoolLogo ? (
          <>
            <div className="flex min-h-12 items-center gap-2 sm:gap-3 xl:hidden">
              {homeIconLink}
              <div className="min-w-0 flex-1" aria-hidden />
              {schoolLogoTablet}
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                {langButton}
                {authButtons(true)}
                {menuButton}
              </div>
            </div>
            <div className="hidden xl:grid xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center xl:gap-6">
              <div className="flex items-center gap-2">
                {homeIconLink}
                {langButton}
                {authButtons()}
              </div>
              <div className="flex min-w-0 justify-center px-2">{desktopNavEl}</div>
              {schoolLogoDesktop}
            </div>
          </>
        ) : (
          <div className="flex w-full items-center justify-between gap-4">
            {brandLink}
            {desktopNavEl}
            <div className="flex shrink-0 items-center gap-2">
              {langButton}
              {authButtons()}
              {menuButton}
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="xl:hidden border-t border-border bg-background">
          <div className="container-page py-4 flex flex-col gap-1">
            {!roleLoading && nav.map((item) => (
              <Link
                key={item.to + item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm font-medium rounded-md hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
            {signedIn && isParent && (
              <Link
                to="/parent/dashboard"
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm font-medium rounded-md hover:bg-muted inline-flex items-center gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                {tr("parent_dashboard_title")}
              </Link>
            )}
            {signedIn && (
              <Link
                to={profilePath}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm font-medium rounded-md hover:bg-muted inline-flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                {profileLabel}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
