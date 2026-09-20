import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { LanguageSelector } from "@/components/language-selector";
import { BrandLogo } from "@/components/brand-logo";
import { useI18n } from "@/lib/i18n";
import { brandLogoPrimaryUrl } from "@/lib/brand";
import { cn } from "@/lib/utils";

const HOME_NAV = [
  { labelKey: "home_nav_home" as const, to: "/", hash: undefined as string | undefined },
  { labelKey: "home_nav_stages" as const, to: "/grades", hash: undefined },
  { labelKey: "home_nav_lessons" as const, to: "/", hash: "featured-lessons" },
  { labelKey: "home_nav_parents" as const, to: "/parent", hash: undefined },
  { labelKey: "home_nav_teachers" as const, to: "/teacher", hash: undefined },
  { labelKey: "home_nav_contact" as const, to: "/contact", hash: undefined },
];

function isNavActive(pathname: string, to: string, hash?: string) {
  if (hash) return false;
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function GhirasHomeHeader() {
  const [open, setOpen] = useState(false);
  const { tr, dir } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const logoUrl = brandLogoPrimaryUrl();

  const iconBtn =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E7E2DC] bg-white text-[#2D2D2D] transition-colors hover:border-[#7A0D14]/40 hover:text-[#7A0D14]";

  const navClass = (active: boolean, mobile?: boolean) =>
    cn(
      "relative whitespace-nowrap font-medium transition-colors",
      mobile ? "block rounded-lg px-3 py-2.5 text-sm" : "px-2 py-1 text-[13px] lg:text-sm xl:px-2.5",
      active ? "text-[#7A0D14]" : "text-[#2D2D2D] hover:text-[#7A0D14]",
      mobile && active && "bg-[#7A0D14]/8",
    );

  const navItems = (mobile?: boolean) =>
    HOME_NAV.map((item) => {
      const marked = isNavActive(pathname, item.to, item.hash);
      if (item.hash) {
        return (
          <a key={item.labelKey} href={`/#${item.hash}`} onClick={() => setOpen(false)} className={navClass(false, mobile)}>
            {tr(item.labelKey)}
          </a>
        );
      }
      return (
        <Link
          key={item.labelKey}
          to={item.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: item.to === "/" }}
          className={navClass(marked, mobile)}
          aria-current={marked ? "page" : undefined}
        >
          {tr(item.labelKey)}
          {marked && !mobile ? (
            <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-[#FF7A00]" aria-hidden />
          ) : null}
        </Link>
      );
    });

  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E2DC] bg-white shadow-[0_1px_0_rgba(45,45,45,0.04)]">
      <div dir="ltr" className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-2.5 sm:px-6 lg:py-3">
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSelector className="h-10 rounded-full border-[#E7E2DC] bg-white shadow-none" />
          <Link to="/resources" aria-label={tr("aria_search")} title={tr("aria_search")} className={iconBtn}>
            <Search className="h-4 w-4" />
          </Link>
          <button
            type="button"
            aria-label={tr("aria_toggle_menu")}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={cn(iconBtn, "lg:hidden")}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <nav dir={dir} className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex xl:gap-1.5">
          {navItems()}
        </nav>

        <Link to="/" className="ms-auto shrink-0 lg:ms-0">
          <BrandLogo src={logoUrl} alt={tr("school_logo_alt")} size="headerCompact" />
        </Link>
      </div>

      {open ? (
        <div className="border-t border-[#E7E2DC] bg-white lg:hidden">
          <nav dir={dir} className="mx-auto flex max-w-[1200px] flex-col gap-0.5 px-4 py-3 sm:px-6">
            {navItems(true)}
            <Link
              to="/auth"
              search={{ mode: "login" }}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-[#7A0D14] px-3 py-2.5 text-center text-sm font-semibold text-[#FAF8F5]"
            >
              {tr("cta_login")}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
