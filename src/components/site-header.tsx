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
      <div className={cn("min-w-0 leading-tight", compact ? "hidden min-[400px]:block max-w-[9.5rem] sm:max-w-[13rem]" : "max-w-[11rem] sm:max-w-[14rem] lg:max-w-[16rem] xl:max-w-[18rem]")}>
        <div className="font-display text-[13px] font-semibold text-foreground leading-snug sm:text-sm md:text-base [overflow-wrap:anywhere]">
          {tr("brand_name")}
        </div>
        {!compact && (
          <div className="mt-0.5 hidden text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:block sm:tracking-[0.16em] lg:text-[11px]">
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
    <BrandLogo src={schoolLogoUrl} alt={schoolLogoAlt} size="header" className="hidden lg:flex" />
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

  const navLinkClass = "px-2.5 py-2 text-[13px] font-medium text-foreground/80 transition-colors rounded-md hover:text-primary";
  const navLinkActiveClass = "text-primary font-semibold";

  const desktopNavEl = (
    <nav className="hidden xl:flex items-center justify-center gap-0.5">
      {!roleLoading && desktopNav.map((item) => (
        <Link
          key={item.to + item.label}
          to={item.to}
          activeOptions={{ exact: item.to === "/" }}
          activeProps={{ className: navLinkActiveClass }}
          className={navLinkClass}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-lg">
      <div className="container-page py-3.5 md:py-4 lg:py-5">
        {/* Mobile & tablet (< xl) */}
        <div className="flex min-h-12 items-center gap-2 sm:gap-3 xl:hidden">
          {brandLink(true)}
          <div className="min-w-0 flex-1" aria-hidden />
          {schoolLogoMobile}
          {schoolLogoTablet}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {langButton}
            {authButtons(true)}
            {menuButton}
          </div>
        </div>

        {/* Desktop (xl+) */}
        <div className="hidden xl:grid xl:grid-cols-[minmax(0,auto)_minmax(0,1fr)_auto] xl:items-center xl:gap-6">
          <div className="flex min-w-0 items-center gap-3">
            {brandLink()}
            {langButton}
            {authButtons()}
          </div>
          <div className="flex min-w-0 justify-center px-2">{desktopNavEl}</div>
          {schoolLogoDesktop}
        </div>
      </div>

      {open && (
        <div className="xl:hidden border-t border-border bg-background">
          <div className="container-page py-4 flex flex-col gap-1">
            {!roleLoading && nav.map((item) => (
              <Link
                key={item.to + item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
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
