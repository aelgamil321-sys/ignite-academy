import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Megaphone } from "lucide-react";
import type { Announcement } from "@/lib/extras";
import type { AnnouncementTopic } from "@/lib/announcement-topics";
import { useI18n } from "@/lib/i18n";
import { localeForFormatting } from "@/lib/i18n-config";

const TOPIC_BADGE_CLASS: Record<AnnouncementTopic, string> = {
  school_news: "bg-primary/20 text-primary ring-primary/30",
  exams: "bg-primary/15 text-primary ring-primary/25",
  events: "bg-amber-400/15 text-amber-200 ring-amber-400/25",
  parents: "bg-sky-400/10 text-sky-100 ring-sky-300/20",
};

function CategoryBadge({
  label,
  topic,
  isDark,
}: {
  label: string;
  topic: AnnouncementTopic;
  isDark: boolean;
}) {
  const tone = isDark
    ? TOPIC_BADGE_CLASS[topic]
    : "bg-primary/12 text-primary ring-primary/25";

  return (
    <span
      className={[
        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1 backdrop-blur-sm",
        tone,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export function AnnouncementCard({
  announcement,
  variant = "dark",
}: {
  announcement: Announcement;
  variant?: "dark" | "light";
}) {
  const { bi, tr, dir, lang } = useI18n();
  const dateLabel = new Date(announcement.createdAt).toLocaleDateString(
    localeForFormatting(lang),
    { year: "numeric", month: "short", day: "numeric" },
  );

  const isDark = variant === "dark";
  const tagLabel = bi(announcement.tag);

  return (
    <article
      className={[
        "group flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-500 ease-out",
        "hover:-translate-y-1.5 hover:shadow-[var(--shadow-gold)]",
        isDark
          ? "border-primary/15 bg-brand-dark text-white hover:border-primary/50"
          : "border-border bg-card text-foreground hover:border-primary shadow-[var(--shadow-soft)]",
      ].join(" ")}
    >
      {announcement.imageUrl ? (
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={announcement.imageUrl}
            alt={bi(announcement.title)}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div
            className={[
              "absolute inset-0 transition-opacity duration-500 group-hover:opacity-90",
              isDark
                ? "bg-gradient-to-t from-brand-dark via-brand-dark/25 to-transparent"
                : "bg-gradient-to-t from-card/95 via-card/15 to-transparent",
            ].join(" ")}
            aria-hidden
          />
          <div className="absolute start-4 top-4">
            <CategoryBadge label={tagLabel} topic={announcement.topic} isDark={isDark} />
          </div>
        </div>
      ) : (
        <div
          className={[
            "relative flex aspect-[16/9] items-center justify-center overflow-hidden",
            isDark
              ? "bg-gradient-to-br from-primary/20 via-brand-dark to-[#252A33]"
              : "bg-gradient-to-br from-primary/12 via-muted/30 to-muted/15",
          ].join(" ")}
        >
          <div
            className="absolute inset-0 opacity-[0.09] transition-opacity duration-500 group-hover:opacity-[0.14]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 22% 22%, var(--primary) 0%, transparent 42%), radial-gradient(circle at 78% 78%, var(--primary) 0%, transparent 38%)",
            }}
            aria-hidden
          />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30 transition-transform duration-500 group-hover:scale-105">
            <Megaphone className="h-7 w-7" />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!announcement.imageUrl && (
            <CategoryBadge label={tagLabel} topic={announcement.topic} isDark={isDark} />
          )}
          <span
            className={[
              "inline-flex items-center gap-1.5",
              isDark ? "text-white/55" : "text-muted-foreground",
            ].join(" ")}
          >
            <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
            {dateLabel || announcement.date}
          </span>
        </div>

        <h3
          className={[
            "mt-3 font-display text-lg leading-snug transition-colors duration-300 sm:text-xl",
            isDark ? "text-white group-hover:text-primary" : "text-foreground group-hover:text-primary",
          ].join(" ")}
        >
          {bi(announcement.title)}
        </h3>

        <p
          className={[
            "mt-2 line-clamp-2 flex-1 text-sm leading-relaxed",
            isDark ? "text-white/70" : "text-muted-foreground",
          ].join(" ")}
        >
          {bi(announcement.excerpt)}
        </p>

        <Link
          to="/announcements/$slug"
          params={{ slug: announcement.slug }}
          className={[
            "mt-4 inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300",
            isDark
              ? "bg-primary text-primary-foreground hover:bg-primary-hover hover:shadow-[0_0_20px_rgba(242,178,27,0.35)]"
              : "border border-primary/30 text-primary hover:bg-primary/10",
            dir === "rtl" ? "flex-row-reverse" : "",
          ].join(" ")}
        >
          {tr("read_more")}
          <ArrowRight
            className={[
              "h-4 w-4 transition-transform duration-300",
              dir === "rtl" ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5",
            ].join(" ")}
          />
        </Link>
      </div>
    </article>
  );
}
