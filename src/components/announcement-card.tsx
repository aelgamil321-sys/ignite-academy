import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Megaphone } from "lucide-react";
import type { Announcement } from "@/lib/extras";
import { useI18n } from "@/lib/i18n";

export function AnnouncementCard({
  announcement,
  variant = "dark",
}: {
  announcement: Announcement;
  variant?: "dark" | "light";
}) {
  const { bi, tr, dir, lang } = useI18n();
  const dateLabel = new Date(announcement.createdAt).toLocaleDateString(
    lang === "ar" ? "ar-EG" : "en-US",
    { year: "numeric", month: "short", day: "numeric" },
  );

  const isDark = variant === "dark";

  return (
    <article
      className={[
        "group flex h-full flex-col overflow-hidden rounded-3xl border transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-[var(--shadow-gold)]",
        isDark
          ? "border-primary/15 bg-brand-dark text-white hover:border-primary/45"
          : "border-border bg-card text-foreground hover:border-primary shadow-[var(--shadow-soft)]",
      ].join(" ")}
    >
      {announcement.imageUrl ? (
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={announcement.imageUrl}
            alt={bi(announcement.title)}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div
            className={[
              "absolute inset-0",
              isDark
                ? "bg-gradient-to-t from-brand-dark via-brand-dark/20 to-transparent"
                : "bg-gradient-to-t from-card/90 via-card/10 to-transparent",
            ].join(" ")}
            aria-hidden
          />
        </div>
      ) : (
        <div
          className={[
            "relative flex aspect-[16/10] items-center justify-center overflow-hidden",
            isDark
              ? "bg-gradient-to-br from-primary/25 via-brand-dark to-brand-dark"
              : "bg-gradient-to-br from-primary/15 via-muted/40 to-muted/20",
          ].join(" ")}
        >
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, var(--primary) 0%, transparent 45%), radial-gradient(circle at 80% 80%, var(--primary) 0%, transparent 40%)",
            }}
            aria-hidden
          />
          <div
            className={[
              "relative flex h-16 w-16 items-center justify-center rounded-2xl",
              isDark ? "bg-primary/20 text-primary" : "bg-primary/15 text-primary",
            ].join(" ")}
          >
            <Megaphone className="h-8 w-8" />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={[
              "rounded-full px-2.5 py-1 font-semibold uppercase tracking-wider",
              isDark ? "bg-primary/20 text-primary" : "bg-primary/15 text-primary",
            ].join(" ")}
          >
            {bi(announcement.tag)}
          </span>
          <span
            className={[
              "inline-flex items-center gap-1.5",
              isDark ? "text-white/60" : "text-muted-foreground",
            ].join(" ")}
          >
            <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
            {dateLabel || announcement.date}
          </span>
        </div>

        <h3
          className={[
            "mt-4 font-display text-xl leading-snug transition-colors sm:text-2xl",
            isDark ? "text-white group-hover:text-primary" : "text-foreground group-hover:text-primary",
          ].join(" ")}
        >
          {bi(announcement.title)}
        </h3>

        <p
          className={[
            "mt-3 line-clamp-3 flex-1 text-sm leading-relaxed",
            isDark ? "text-white/75" : "text-muted-foreground",
          ].join(" ")}
        >
          {bi(announcement.excerpt)}
        </p>

        <Link
          to="/announcements/$slug"
          params={{ slug: announcement.slug }}
          className={[
            "mt-5 inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all",
            isDark
              ? "bg-primary text-primary-foreground hover:bg-primary-hover"
              : "border border-primary/30 text-primary hover:bg-primary/10",
            dir === "rtl" ? "flex-row-reverse" : "",
          ].join(" ")}
        >
          {tr("read_more")}
          <ArrowRight
            className={[
              "h-4 w-4 transition-transform",
              dir === "rtl" ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5",
            ].join(" ")}
          />
        </Link>
      </div>
    </article>
  );
}
