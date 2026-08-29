import { Calendar } from "lucide-react";
import type { Announcement } from "@/lib/extras";
import { useI18n } from "@/lib/i18n";
import { localeForFormatting } from "@/lib/i18n-config";

export function AnnouncementArticleBody({ announcement }: { announcement: Announcement }) {
  const { bi, lang } = useI18n();
  const dateLabel = new Date(announcement.createdAt).toLocaleDateString(
    localeForFormatting(lang),
    { year: "numeric", month: "short", day: "numeric" },
  );

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-foreground/65">
        <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
          {bi(announcement.tag)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden />
          {dateLabel || announcement.date}
        </span>
      </div>
      {announcement.imageUrl ? (
        <img
          src={announcement.imageUrl}
          alt={bi(announcement.title)}
          className="mb-5 w-full max-w-3xl rounded-xl border border-border/90 shadow-sm"
        />
      ) : null}
      <article className="max-w-3xl">
        <p className="whitespace-pre-line text-base leading-relaxed text-foreground/85">{bi(announcement.body)}</p>
      </article>
    </>
  );
}
