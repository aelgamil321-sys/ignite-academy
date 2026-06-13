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
  /** Homepage header: school logo + Ignite palette; academy name lives in hero only. */
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
  const igniteHome = showSchoolLogo;

  const brandLink = (
    <Link to="/" className="group flex min-w-0 items-center gap-2 sm:gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-[var(--shadow-soft)] sm:h-11 sm:w-11",
          igniteHome
            ? "bg-ignite-gold text-ignite-dark"
            : "bg-gradient-to-br from-primary to-emerald text-primary-foreground",
        )}
      >
        <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      {!igniteHome && (
        <div className="min-w-0 leading-tight">
          <div className="truncate font-display text-base font-semibold text-primary sm:text-lg">
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
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ignite-gold text-ignite-dark shadow-[var(--shadow-soft)] transition-opacity hover:opacity-90 sm:h-11 sm:w-11"
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
          className={cn(
            "hidden md:inline-flex items-center gap-1.5 justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors shadow-[var(--shadow-soft)]",
            igniteHome
              ? "bg-ignite-gold text-ignite-dark hover:bg-ignite-gold/90"
              : "bg-primary text-primary-foreground hover:bg-emerald",
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          {!compact && tr("parent_dashboard_title")}
        </Link>
      )}
      {signedIn ? (
        <Link
          to={profilePath}
          className={cn(
            "hidden md:inline-flex items-center gap-1.5 justify-center rounded-full border bg-card px-5 py-2.5 text-sm font-semibold transition-colors",
            igniteHome
              ? "border-ignite-dark/15 text-ignite-dark hover:border-ignite-gold hover:text-ignite-gold"
              : "border-border text-foreground hover:border-emerald hover:text-emerald",
          )}
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
          className={cn(
            "hidden md:inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors shadow-[var(--shadow-soft)]",
            igniteHome
              ? "bg-ignite-gold text-ignite-dark hover:bg-ignite-gold/90"
              : "bg-primary text-primary-foreground hover:bg-emerald",
          )}
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
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-2 text-sm font-semibold transition-colors sm:px-3",
        igniteHome
          ? "border-ignite-dark/15 text-ignite-dark hover:border-ignite-gold hover:text-ignite-gold"
          : "border-border text-foreground hover:border-emerald hover:text-emerald",
      )}
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
    <nav className={cn("items-center justify-center gap-0.5", igniteHome ? "hidden xl:flex" : "hidden xl:flex")}>
      {!roleLoading && desktopNav.map((item) => (
        <Link
          key={item.to + item.label}
          to={item.to}
          activeOptions={{ exact: item.to === "/" }}
          activeProps={{ className: igniteHome ? "text-ignite-gold" : "text-primary" }}
          className={cn(
            "rounded-md font-medium transition-colors",
            igniteHome
              ? "px-2.5 py-2 text-[13px] text-ignite-dark/80 hover:text-ignite-gold"
              : "px-3 py-2 text-sm text-foreground/80 hover:text-primary",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-lg",
        igniteHome
          ? "border-ignite-dark/10 bg-ignite-bg/95"
          : "border-border/60 bg-background/80",
      )}
    >
      <div
        className={cn(
          "container-page",
          showSchoolLogo ? "py-3.5 md:py-4 lg:py-5" : "flex h-18 items-center justify-between py-4",
        )}
      >
        {showSchoolLogo ? (
          <>
            {/* Mobile & tablet: home icon, optional compact logo, lang, menu */}
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

            {/* Desktop: actions left, nav center, school logo right */}
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
          <div className="flex items-center justify-between">
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
        <div className={cn("xl:hidden border-t", igniteHome ? "border-ignite-dark/10 bg-ignite-bg" : "border-border bg-background")}>
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
