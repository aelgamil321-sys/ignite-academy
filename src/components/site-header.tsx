import { Link } from "@tanstack/react-router";
import { Menu, X, BookOpen, Languages, User, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useAccountRole } from "@/hooks/use-account-role";
import {
  certificateIslamicLogoUrl,
  certificateSchoolLogoUrl,
} from "@/lib/certificate-branding";
import { cn } from "@/lib/utils";

function PartnerLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      className="flex h-9 w-[3.25rem] shrink-0 items-center justify-center sm:h-11 sm:w-[4.25rem] md:h-12 md:w-24 lg:h-14 lg:w-28"
      aria-hidden={false}
    >
      <img
        src={src}
        alt={alt}
        width={112}
        height={56}
        className="max-h-full max-w-full object-contain object-center"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}

const STUDENT_ONLY_PATHS = new Set(["/grades", "/quizzes", "/student"]);

type SiteHeaderProps = {
  /** Show Ignite School + Islamic Education Department logos (homepage). */
  showPartnerLogos?: boolean;
};

export function SiteHeader({ showPartnerLogos = false }: SiteHeaderProps) {
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

  const islamicLogoUrl = certificateIslamicLogoUrl();
  const schoolLogoUrl = certificateSchoolLogoUrl();
  const islamicLogoAlt = lang === "ar" ? "قسم التربية الإسلامية" : "Department of Islamic Education";
  const schoolLogoAlt = lang === "ar" ? "مدرسة إشعال" : "Ignite School";

  const brandLink = (
    <Link to="/" className="group flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald text-primary-foreground shadow-[var(--shadow-soft)] sm:h-11 sm:w-11">
        <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate font-display text-base font-semibold text-primary sm:text-lg">{tr("brand_name")}</div>
        <div className="truncate text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">
          {tr("brand_sub")}
        </div>
      </div>
    </Link>
  );

  const headerActions = (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <button
        onClick={toggle}
        aria-label="Toggle language"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-2 text-sm font-semibold text-foreground hover:border-emerald hover:text-emerald transition-colors sm:px-3"
      >
        <Languages className="h-4 w-4" />
        <span className="hidden sm:inline">{lang === "en" ? "العربية" : "English"}</span>
      </button>
      {signedIn && isParent && (
        <Link
          to="/parent/dashboard"
          className="hidden md:inline-flex items-center gap-1.5 justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors shadow-[var(--shadow-soft)]"
        >
          <LayoutDashboard className="h-4 w-4" />
          {tr("parent_dashboard_title")}
        </Link>
      )}
      {signedIn ? (
        <Link
          to={profilePath}
          className="hidden md:inline-flex items-center gap-1.5 justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:border-emerald hover:text-emerald transition-colors"
        >
          <User className="h-4 w-4" />
          {profileLabel}
        </Link>
      ) : (
        <a
          href="/auth?mode=login"
          onClick={(e) => {
            e.preventDefault();
            window.location.assign("/auth?mode=login");
          }}
          className="hidden md:inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors shadow-[var(--shadow-soft)]"
        >
          {tr("nav_login")}
        </a>
      )}
      <button
        aria-label="Toggle menu"
        onClick={() => setOpen((o) => !o)}
        className="xl:hidden inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  );

  const desktopNavEl = (
    <nav className="hidden xl:flex items-center justify-center gap-1">
      {!roleLoading && desktopNav.map((item) => (
        <Link
          key={item.to + item.label}
          to={item.to}
          activeOptions={{ exact: item.to === "/" }}
          activeProps={{ className: "text-primary" }}
          className="px-3 py-2 text-sm font-medium text-foreground/80 hover:text-primary transition-colors rounded-md"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div
        className={cn(
          "container-page py-3 md:py-4",
          showPartnerLogos
            ? "space-y-2.5 xl:space-y-0"
            : "flex h-18 items-center justify-between",
        )}
      >
        {showPartnerLogos ? (
          <>
            <div className="flex items-center gap-2 sm:gap-3 xl:hidden">
              <PartnerLogo src={islamicLogoUrl} alt={islamicLogoAlt} />
              <div className="flex min-w-0 flex-1 justify-center px-0.5 sm:px-1">{brandLink}</div>
              <PartnerLogo src={schoolLogoUrl} alt={schoolLogoAlt} />
            </div>
            <div className="flex items-center justify-end xl:hidden">{headerActions}</div>
            <div className="hidden xl:grid xl:grid-cols-[auto_auto_1fr_auto_auto] xl:items-center xl:gap-4">
              <PartnerLogo src={islamicLogoUrl} alt={islamicLogoAlt} />
              {brandLink}
              {desktopNavEl}
              <PartnerLogo src={schoolLogoUrl} alt={schoolLogoAlt} />
              {headerActions}
            </div>
          </>
        ) : (
          <>
            {brandLink}
            {desktopNavEl}
            {headerActions}
          </>
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
