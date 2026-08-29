import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSelector } from "@/components/language-selector";
import { SafeNotificationBell } from "@/components/notification-bell";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { certificateSchoolLogoUrl } from "@/lib/certificate-branding";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TeacherDashboardTopbarProps = {
  teacherName: string;
  profilePhotoPath?: string | null;
  onMenuClick: () => void;
};

export function TeacherDashboardTopbar({
  teacherName,
  profilePhotoPath = null,
  onMenuClick,
}: TeacherDashboardTopbarProps) {
  const { tr } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 shadow-[var(--shadow-soft)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex min-h-[3.25rem] min-w-0 items-center gap-2 px-4 py-2 sm:gap-3 sm:px-5 lg:px-6">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:border-primary/40 hover:text-primary lg:hidden"
          aria-label={tr("teacher_dash_open_menu")}
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/teacher" className="flex min-w-0 shrink-0 items-center gap-2 lg:hidden">
          <BrandLogo
            src={certificateSchoolLogoUrl()}
            alt={tr("school_logo_alt")}
            size="headerCompact"
            className="rounded-md bg-white p-0.5"
          />
        </Link>

        <div className="hidden min-w-0 lg:block">
          <p className="truncate font-display text-sm font-semibold text-foreground sm:text-base">
            {tr("teacher_title")}
          </p>
          <p className="truncate text-xs text-muted-foreground">{tr("teacher_dash_topbar_lead")}</p>
        </div>

        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <SafeNotificationBell className="h-10 w-10" />
          <LanguageSelector className="h-10" />
          <Link
            to="/teacher/profile"
            className={cn(
              "inline-flex h-10 min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-2 text-start transition-colors hover:border-primary/40 sm:px-2.5",
            )}
            aria-label={tr("teacher_profile_title")}
          >
            <StudentProfileAvatar
              profilePhotoPath={profilePhotoPath}
              alt={teacherName}
              className="h-8 w-8 rounded-lg"
              fallbackClassName="rounded-lg text-xs font-semibold"
            />
            <span className="hidden max-w-[9rem] truncate text-sm font-medium text-foreground md:inline">
              {teacherName}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
