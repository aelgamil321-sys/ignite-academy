import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { Announcement } from "@/lib/extras";
import { useI18n } from "@/lib/i18n";
import { AnnouncementCard } from "@/components/announcement-card";

function SectionHeading({
  eyebrow,
  title,
  viewAllLabel,
}: {
  eyebrow: string;
  title: string;
  viewAllLabel: string;
}) {
  const { dir } = useI18n();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</div>
        <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl">{title}</h2>
      </div>
      <Link
        to="/announcements"
        className={[
          "inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/35 px-5 py-2.5 text-sm font-semibold text-primary transition-all",
          "hover:border-primary hover:bg-primary/10",
          dir === "rtl" ? "flex-row-reverse" : "",
        ].join(" ")}
      >
        {viewAllLabel}
        <ArrowRight className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
      </Link>
    </div>
  );
}

function AnnouncementsEmptyState() {
  const { tr } = useI18n();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-brand-dark p-8 text-center text-white shadow-[var(--shadow-soft)] sm:p-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, var(--primary) 0%, transparent 42%), radial-gradient(circle at 85% 80%, var(--primary) 0%, transparent 38%)",
        }}
        aria-hidden
      />
      <div className="relative">
        <div className="text-5xl" aria-hidden>
          📢
        </div>
        <p className="mt-5 font-display text-2xl text-primary sm:text-3xl">{tr("empty_announcements_title")}</p>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
          {tr("empty_announcements_desc")}
        </p>
      </div>
    </div>
  );
}

export function HomepageAnnouncements({ announcements }: { announcements: Announcement[] }) {
  const { tr } = useI18n();
  const latest = announcements.slice(0, 3);

  return (
    <section className="container-page py-20">
      <SectionHeading
        eyebrow={tr("ann_eyebrow")}
        title={tr("ann_title")}
        viewAllLabel={tr("ann_view_all")}
      />

      <div className="mt-10">
        {latest.length === 0 ? (
          <AnnouncementsEmptyState />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {latest.map((announcement) => (
              <AnnouncementCard key={announcement.slug} announcement={announcement} variant="dark" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
