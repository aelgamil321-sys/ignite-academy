import { UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PARENT_DASH_SECTION, PARENT_DASH_SECTION_TITLE } from "@/lib/parent-dashboard-ui";

function ParentInitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
      {initials ? (
        <span className="font-display text-lg font-semibold">{initials}</span>
      ) : (
        <UserRound className="h-7 w-7" aria-hidden />
      )}
    </div>
  );
}

type ParentSettingsProfileCardProps = {
  fullName: string;
  email: string;
};

export function ParentSettingsProfileCard({ fullName, email }: ParentSettingsProfileCardProps) {
  const { tr } = useI18n();
  const displayName = fullName.trim() || email || "—";

  return (
    <section className={PARENT_DASH_SECTION} aria-labelledby="parent-settings-profile-heading">
      <h2 id="parent-settings-profile-heading" className={PARENT_DASH_SECTION_TITLE}>
        {tr("parent_settings_profile_heading")}
      </h2>

      <div className="mt-3 flex items-start gap-4">
        <ParentInitialsAvatar name={displayName} />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/55">
              {tr("parent_name_label")}
            </div>
            <div className="mt-0.5 font-display text-lg font-semibold text-foreground break-words">
              {fullName || "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/55">
              {tr("your_email")}
            </div>
            <div className="mt-0.5 text-sm text-foreground/80 break-all">{email || "—"}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/55">
              {tr("parent_settings_role_label")}
            </div>
            <div className="mt-1 inline-flex rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {tr("auth_role_parent")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
