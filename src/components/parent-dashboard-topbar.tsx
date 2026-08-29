import { Link } from "@tanstack/react-router";
import { Menu, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSelector } from "@/components/language-selector";
import { certificateSchoolLogoUrl } from "@/lib/certificate-branding";
import { useI18n } from "@/lib/i18n";
import { useParentShell } from "@/lib/parent-shell-context";
import { cn } from "@/lib/utils";

type ParentDashboardTopbarProps = {
  onMenuClick: () => void;
};

function ParentInitialsAvatar({ name, compact = false }: { name: string; compact?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
        compact ? "h-8 w-8" : "h-10 w-10",
      )}
    >
      {initials ? (
        <span className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{initials}</span>
      ) : (
        <UserRound className={compact ? "h-4 w-4" : "h-5 w-5"} />
      )}
    </div>
  );
}

export function ParentDashboardTopbar({ onMenuClick }: ParentDashboardTopbarProps) {
  const { tr } = useI18n();
  const { displayName } = useParentShell();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 shadow-[var(--shadow-soft)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex min-h-[3.25rem] min-w-0 items-center gap-2 px-4 py-2 sm:gap-3 sm:px-5 lg:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:border-primary/40 hover:text-primary lg:hidden"
          aria-label={tr("parent_dash_open_menu")}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/parent/dashboard" className="flex min-w-0 shrink-0 items-center gap-2 lg:hidden">
          <BrandLogo
            src={certificateSchoolLogoUrl()}
            alt={tr("school_logo_alt")}
            size="headerCompact"
            className="rounded-md bg-white p-0.5"
          />
        </Link>

        <Link
          to="/parent/settings"
          className="hidden min-w-0 flex-1 items-center gap-3 lg:flex"
        >
          <ParentInitialsAvatar name={displayName} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{tr("auth_role_parent")}</p>
          </div>
        </Link>

        <div className="hidden min-w-0 lg:block lg:flex-1">
          <p className="truncate text-end text-xs text-muted-foreground">{tr("parent_dash_topbar_lead")}</p>
        </div>

        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageSelector className="h-10" />
          <Link
            to="/parent/settings"
            className={cn(
              "inline-flex h-10 min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-2 text-start transition-colors hover:border-primary/40 lg:hidden",
            )}
            aria-label={tr("parent_nav_profile")}
          >
            <ParentInitialsAvatar name={displayName} compact />
            <span className="hidden max-w-[7rem] truncate text-sm font-medium text-foreground sm:inline">
              {displayName}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
