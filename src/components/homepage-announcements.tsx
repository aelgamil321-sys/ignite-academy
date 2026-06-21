import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Megaphone,
  Newspaper,
  Users,
} from "lucide-react";
import type { Announcement } from "@/lib/extras";
import { useI18n } from "@/lib/i18n";
import { AnnouncementCard } from "@/components/announcement-card";
import { AnnouncementsEmptyIllustration } from "@/components/announcements-empty-illustration";

const EMPTY_ITEMS = [
  { key: "empty_announcements_item_news", icon: Newspaper },
  { key: "empty_announcements_item_exams", icon: ClipboardList },
  { key: "empty_announcements_item_events", icon: CalendarDays },
  { key: "empty_announcements_item_parents", icon: Users },
] as const;

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  viewAllLabel,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  viewAllLabel: string;
}) {
  const { dir } = useI18n();

  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl lg:text-[3.25rem] lg:leading-tight">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
        {subtitle}
      </p>
      <div className="mt-7 flex justify-center">
        <Link
          to="/announcements"
          className={[
            "group inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-6 py-2.5 text-sm font-semibold text-primary",
            "transition-all duration-300 hover:border-primary hover:bg-primary/15 hover:shadow-[var(--shadow-gold)]",
            dir === "rtl" ? "flex-row-reverse" : "",
          ].join(" ")}
        >
          {viewAllLabel}
          <ArrowRight
            className={[
              "h-4 w-4 transition-transform duration-300",
              dir === "rtl" ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5",
            ].join(" ")}
          />
        </Link>
      </div>
    </div>
  );
}

function AnnouncementsEmptyState() {
  const { tr, dir } = useI18n();

  return (
    <div
      className={[
        "announcement-empty-enter group relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-primary/20",
        "bg-brand-dark text-white shadow-[var(--shadow-soft)]",
        "transition-shadow duration-500 hover:shadow-[var(--shadow-gold)]",
        "px-5 py-5 sm:px-7 sm:py-6",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 18%, var(--primary) 0%, transparent 38%), radial-gradient(circle at 88% 82%, var(--primary) 0%, transparent 34%)",
        }}
        aria-hidden
      />

      <div
        className={[
          "relative flex flex-col items-center gap-4 sm:flex-row sm:gap-6",
          dir === "rtl" ? "sm:flex-row-reverse" : "",
        ].join(" ")}
      >
        <div className="shrink-0">
          <AnnouncementsEmptyIllustration className="h-[88px] w-[100px] sm:h-[96px] sm:w-[110px] drop-shadow-[0_8px_24px_rgba(242,178,27,0.2)] transition-transform duration-500 group-hover:scale-[1.03]" />
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-start">
          <div className="inline-flex items-center gap-2 text-primary">
            <Megaphone className="h-4 w-4 shrink-0" aria-hidden />
            <p className="font-display text-lg text-primary sm:text-xl">{tr("empty_announcements_title")}</p>
          </div>

          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-white/55 sm:text-sm">
            {tr("empty_announcements_intro")}
          </p>

          <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-1.5">
            {EMPTY_ITEMS.map(({ key, icon: Icon }, index) => (
              <li
                key={key}
                className="announcement-empty-item flex items-center gap-2 text-sm text-white/82"
                style={{ animationDelay: `${120 + index * 70}ms` }}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="leading-snug">{tr(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function HomepageAnnouncements({ announcements }: { announcements: Announcement[] }) {
  const { tr } = useI18n();
  const latest = announcements.slice(0, 3);

  return (
    <section className="announcement-section-enter container-page py-16 md:py-20">
      <SectionHeading
        eyebrow={tr("ann_eyebrow")}
        title={tr("ann_title")}
        subtitle={tr("ann_subtitle")}
        viewAllLabel={tr("ann_view_all")}
      />

      <div className="mt-8 md:mt-10">
        {latest.length === 0 ? (
          <AnnouncementsEmptyState />
        ) : (
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {latest.map((announcement, index) => (
              <div
                key={announcement.slug}
                className="announcement-card-enter h-full"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <AnnouncementCard announcement={announcement} variant="dark" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
