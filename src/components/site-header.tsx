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

/** Shared pill styles for header controls and nav links */
const headerPillBase =
  "inline-flex items-center justify-center rounded-lg border border-border/80 bg-card text-foreground shadow-[var(--shadow-soft)] transition-all hover:border-primary/45 hover:text-primary hover:shadow-[var(--shadow-elegant)]";

const navPillBase = cn(
  headerPillBase,
  "px-2 py-1.5 text-[11px] font-medium leading-none whitespace-nowrap 2xl:px-2.5 2xl:py-1.5 2xl:text-xs",
);

const navPillActive = cn(
  navPillBase,
  "border-primary/55 bg-primary/15 text-primary font-semibold shadow-[0_0_0_1px_color-mix(in_srgb,var(--primary)_35%,transparent)] hover:text-primary",
);

const mobileNavPillBase = cn(
  headerPillBase,
  "w-full justify-start px-3 py-2.5 text-sm font-medium",
);

const mobileNavPillActive = cn(
  mobileNavPillBase,
  "border-primary/55 bg-primary/15 text-primary font-semibold hover:text-primary",
);

export function SiteHeader() {
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

  const brandLink = (compact?: boolean) => (
    <Link to="/" className="group flex min-w-0 items-center gap-2 sm:gap-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)] sm:h-10 sm:w-10">
        <BookOpen className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
      </div>
      <div
        className={cn(
          "min-w-0 leading-tight",
          compact
            ? "hidden min-[400px]:block max-w-[9.5rem] sm:max-w-[13rem]"
            : "max-w-[10rem] sm:max-w-[12rem] 2xl:max-w-[16rem]",
        )}
      >
        <div className="font-display text-[13px] font-semibold text-foreground leading-snug sm:text-sm [overflow-wrap:anywhere]">
          {tr("brand_name")}
        </div>
        {!compact && (
          <div className="mt-0.5 hidden text-[10px] uppercase tracking-[0.14em] text-muted-foreground 2xl:block 2xl:tracking-[0.16em]">
            {tr("brand_org")}
          </div>
        )}
      </div>
    </Link>
  );

  const schoolLogoMobile = (
    <BrandLogo src={schoolLogoUrl} alt={schoolLogoAlt} size="headerCompact" className="flex shrink-0 md:hidden" />
  );

  const schoolLogoTablet = (
    <BrandLogo src={schoolLogoUrl} alt={schoolLogoAlt} size="headerCompact" className="hidden md:flex lg:hidden" />
  );

  const schoolLogoDesktop = (
    <BrandLogo src={schoolLogoUrl} alt={schoolLogoAlt} size="header" className="hidden lg:flex shrink-0" />
  );

  const authButtons = () => (
    <>
      {signedIn && isParent && (
        <Link
          to="/parent/dashboard"
          aria-label={tr("parent_dashboard_title")}
          title={tr("parent_dashboard_title")}
          className={cn(headerPillBase, "hidden md:inline-flex h-8 w-8 shrink-0 bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground hover:border-primary")}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
        </Link>
      )}
      {signedIn ? (
        <Link
          to={profilePath}
          aria-label={profileLabel}
          title={profileLabel}
          className={cn(headerPillBase, "hidden md:inline-flex h-8 w-8 shrink-0")}
        >
          <User className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <a
          href="/auth?mode=login"
          aria-label={tr("nav_login")}
          title={tr("nav_login")}
          onClick={(e) => {
            e.preventDefault();
            window.location.assign("/auth?mode=login");
          }}
          className={cn(
            headerPillBase,
            "hidden md:inline-flex h-8 shrink-0 px-2.5 text-[11px] font-semibold bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground hover:border-primary",
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
      className={cn(headerPillBase, "h-8 shrink-0 gap-1 px-2 text-[11px] font-semibold sm:px-2.5")}
    >
      <Languages className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{lang === "en" ? "العربية" : "EN"}</span>
    </button>
  );

  const menuButton = (
    <button
      aria-label="Toggle menu"
      onClick={() => setOpen((o) => !o)}
      className={cn(headerPillBase, "xl:hidden h-8 w-8 shrink-0 hover:bg-muted")}
    >
      {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
    </button>
  );

  const desktopNavEl = (
    <nav className="hidden xl:flex flex-1 flex-wrap items-center justify-center gap-1 min-w-0 px-1 2xl:gap-1.5">
      {!roleLoading && desktopNav.map((item) => (
        <Link
          key={item.to + item.label}
          to={item.to}
          activeOptions={{ exact: item.to === "/" }}
          activeProps={{ className: navPillActive }}
          className={navPillBase}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-lg">
      <div className="container-page py-3 md:py-3.5 lg:py-4">
        {/* Mobile & tablet (< xl) */}
        <div className="flex min-h-11 items-center gap-2 sm:gap-3 xl:hidden">
          {brandLink(true)}
          <div className="min-w-0 flex-1" aria-hidden />
          {schoolLogoMobile}
          {schoolLogoTablet}
          <div className="flex shrink-0 items-center gap-1.5">
            {langButton}
            {menuButton}
          </div>
        </div>

        {/* Desktop (xl+) — brand | nav pills | utilities + logo */}
        <div className="hidden xl:flex xl:items-center xl:gap-3 2xl:gap-4">
          <div className="shrink-0">{brandLink()}</div>
          {desktopNavEl}
          <div className="flex shrink-0 items-center gap-1.5 2xl:gap-2">
            {langButton}
            {authButtons()}
            {schoolLogoDesktop}
          </div>
        </div>
      </div>

      {open && (
        <div className="xl:hidden border-t border-border bg-background">
          <div className="container-page py-4 flex flex-col gap-1.5">
            {!roleLoading && nav.map((item) => (
              <Link
                key={item.to + item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: mobileNavPillActive }}
                className={mobileNavPillBase}
              >
                {item.label}
              </Link>
            ))}
            {signedIn && isParent && (
              <Link
                to="/parent/dashboard"
                onClick={() => setOpen(false)}
                className={cn(mobileNavPillBase, "gap-2")}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {tr("parent_dashboard_title")}
              </Link>
            )}
            {signedIn && (
              <Link
                to={profilePath}
                onClick={() => setOpen(false)}
                className={cn(mobileNavPillBase, "gap-2")}
              >
                <User className="h-4 w-4 shrink-0" />
                {profileLabel}
              </Link>
            )}
            {!signedIn && (
              <a
                href="/auth?mode=login"
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  window.location.assign("/auth?mode=login");
                }}
                className={cn(mobileNavPillBase, "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground hover:border-primary")}
              >
                {tr("nav_login")}
              </a>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
