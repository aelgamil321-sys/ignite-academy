import { Link } from "@tanstack/react-router";
import { Menu, X, BookOpen, Languages, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const { tr, toggle, lang } = useI18n();

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

  const nav: Array<{ label: string; to: string }> = [
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

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="container-page flex h-18 items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald text-primary-foreground shadow-[var(--shadow-soft)]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold text-primary">{tr("brand_name")}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{tr("brand_sub")}</div>
          </div>
        </Link>

        <nav className="hidden xl:flex items-center gap-1">
          {nav.slice(0, 8).map((item) => (
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

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label="Toggle language"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:border-emerald hover:text-emerald transition-colors"
          >
            <Languages className="h-4 w-4" />
            <span>{lang === "en" ? "العربية" : "English"}</span>
          </button>
          {signedIn ? (
            <Link
              to="/student/profile"
              className="hidden md:inline-flex items-center gap-1.5 justify-center rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:border-emerald hover:text-emerald transition-colors"
            >
              <User className="h-4 w-4" />
              {lang === "ar" ? "الملف الشخصي" : "Profile"}
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="hidden md:inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors shadow-[var(--shadow-soft)]"
            >
              {tr("nav_login")}
            </Link>
          )}
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
            className="xl:hidden inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="xl:hidden border-t border-border bg-background">
          <div className="container-page py-4 flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.to + item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm font-medium rounded-md hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
            {signedIn && (
              <Link
                to="/student/profile"
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm font-medium rounded-md hover:bg-muted inline-flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                {lang === "ar" ? "الملف الشخصي" : "Profile"}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
