import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSelector } from "@/components/language-selector";
import { SafeNotificationBell } from "@/components/notification-bell";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { certificateSchoolLogoUrl } from "@/lib/certificate-branding";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";
import { useStudentShell } from "@/lib/student-shell-context";
import { cn } from "@/lib/utils";

type StudentDashboardTopbarProps = {
  onMenuClick: () => void;
};

export function StudentDashboardTopbar({ onMenuClick }: StudentDashboardTopbarProps) {
  const { tr, lang } = useI18n();
  const {
    displayName,
    profilePhotoPath,
    hasGrade,
    gradeSlug,
    section,
    islamicGroup,
  } = useStudentShell();

  const gradeLabel = hasGrade ? gradeDisplayName(gradeSlug, lang) : null;
  const sectionLabelText = section ? sectionLabel(section, lang) : null;
  const islamicLabel = islamicGroup ? islamicGroupLabel(islamicGroup, lang) : null;

  const scopeParts = [gradeLabel, sectionLabelText].filter(Boolean).join(" · ");

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 shadow-[var(--shadow-soft)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex min-h-[3.25rem] min-w-0 items-center gap-2 px-4 py-2 sm:gap-3 sm:px-5 lg:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:border-primary/40 hover:text-primary lg:hidden"
          aria-label={tr("student_dash_open_menu")}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/student" className="flex min-w-0 shrink-0 items-center gap-2 lg:hidden">
          <BrandLogo
            src={certificateSchoolLogoUrl()}
            alt={tr("school_logo_alt")}
            size="headerCompact"
            className="rounded-md bg-white p-0.5"
          />
        </Link>

        <Link
          to="/student/profile"
          className="hidden min-w-0 flex-1 items-center gap-3 lg:flex"
        >
          <StudentProfileAvatar
            profilePhotoPath={profilePhotoPath}
            alt={displayName}
            className="h-10 w-10 rounded-lg"
            fallbackClassName="rounded-lg text-sm font-semibold"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
              {displayName}
            </p>
            {scopeParts ? (
              <p className="truncate text-xs text-muted-foreground">{scopeParts}</p>
            ) : null}
            {islamicLabel ? (
              <p className="truncate text-xs text-muted-foreground">{islamicLabel}</p>
            ) : null}
          </div>
        </Link>

        <div className="hidden min-w-0 lg:block lg:flex-1">
          <p className="truncate text-end text-xs text-muted-foreground">{tr("student_dash_topbar_lead")}</p>
        </div>

        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <SafeNotificationBell className="h-10 w-10" />
          <LanguageSelector className="h-10" />
          <Link
            to="/student/profile"
            className={cn(
              "inline-flex h-10 min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-2 text-start transition-colors hover:border-primary/40 lg:hidden",
            )}
            aria-label={tr("student_nav_profile")}
          >
            <StudentProfileAvatar
              profilePhotoPath={profilePhotoPath}
              alt={displayName}
              className="h-8 w-8 rounded-lg"
              fallbackClassName="rounded-lg text-xs font-semibold"
            />
            <span className="hidden max-w-[7rem] truncate text-sm font-medium text-foreground sm:inline">
              {displayName}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
