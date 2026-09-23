import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { brandLogoTransparentUrl } from "@/lib/brand";
import { darkNav } from "@/lib/theme";

type GhirasSidebarBrandProps = {
  to: string;
  alt: string;
  title: string;
  subtitle: string;
};

export function GhirasSidebarBrand({ to, alt, title, subtitle }: GhirasSidebarBrandProps) {
  return (
    <div className="shrink-0 border-b border-white/10 px-2.5 py-3">
      <Link to={to} className="flex justify-center">
        <BrandLogo src={brandLogoTransparentUrl()} alt={alt} size="sidebar" />
      </Link>
      <p className={`mt-2 ${darkNav.title}`}>{title}</p>
      <p className={darkNav.subtitle}>{subtitle}</p>
    </div>
  );
}
