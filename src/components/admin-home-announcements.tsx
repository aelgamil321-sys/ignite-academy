import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Megaphone, Plus } from "lucide-react";
import { announcementAudienceLabel } from "@/lib/announcement-audience";
import { fetchAnnouncementCreatorNames } from "@/lib/announcement-creator-names";
import {
  inferAnnouncementTopic,
  announcementTopicLabel,
  type AnnouncementTopic,
} from "@/lib/announcement-topics";
import { useCMS } from "@/lib/cms";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n, L } from "@/lib/i18n";
import { localeForFormatting } from "@/lib/i18n-config";
import { sectionLabel } from "@/lib/student-academics";
import { AnnouncementsEmptyIllustration } from "@/components/announcements-empty-illustration";

export function AdminHomeAnnouncements() {
  const { tr, bi, lang, dir } = useI18n();
  const { articles } = useCMS();
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  const announcements = articles
    .filter((a) => a.published && a.category === "announcement")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);

  useEffect(() => {
    const ids = announcements.map((a) => a.createdBy).filter(Boolean) as string[];
    if (ids.length === 0) {
      setCreatorNames({});
      return;
    }
    void fetchAnnouncementCreatorNames(ids).then(setCreatorNames);
  }, [announcements]);

  return (
    <section className="announcement-section-enter container-page py-16 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{tr("ann_eyebrow")}</p>
        <h2 className="mt-3 font-display text-4xl text-foreground md:text-5xl lg:text-[3.25rem] lg:leading-tight">
          {tr("ann_title")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {tr("ann_subtitle")}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/admin"
            search={{ tab: "new-article" }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {tr("admin_home_add_announcement")}
          </Link>
          <Link
            to="/announcements"
            className={[
              "group inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-6 py-2.5 text-sm font-semibold text-primary",
              "transition-all duration-300 hover:border-primary hover:bg-primary/15",
              dir === "rtl" ? "flex-row-reverse" : "",
            ].join(" ")}
          >
            {tr("ann_view_all")}
            <ArrowRight
              className={[
                "h-4 w-4 transition-transform duration-300",
                dir === "rtl" ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5",
              ].join(" ")}
            />
          </Link>
        </div>
      </div>

      <div className="mt-8 md:mt-10">
        {announcements.length === 0 ? (
          <div className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-brand-dark p-8 text-center text-white">
            <AnnouncementsEmptyIllustration className="mx-auto h-24 w-28 opacity-90" />
            <p className="mt-4 font-display text-lg text-primary">{tr("empty_announcements_title")}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {announcements.map((article) => {
              const topic: AnnouncementTopic =
                article.announcementTopic ??
                inferAnnouncementTopic(article.title, article.content, article.category);
              const topicLabel = bi(announcementTopicLabel(topic));
              const audienceValue = article.audience ?? "all";
              const audienceLabel = bi(announcementAudienceLabel(audienceValue));
              const dateLabel = new Date(article.createdAt).toLocaleString(localeForFormatting(lang), {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const gradeLabel = article.grade
                ? gradeDisplayName(article.grade, lang)
                : tr("admin_ann_all_grades");
              const sectionLabelText = article.targetSection
                ? sectionLabel(article.targetSection, lang)
                : tr("admin_ann_all_sections");
              const creatorLabel = article.createdBy
                ? creatorNames[article.createdBy] ?? tr("admin_ann_creator_unavailable")
                : tr("admin_ann_creator_unavailable");

              return (
                <article
                  key={article.id}
                  className="flex h-full flex-col rounded-2xl border border-primary/15 bg-brand-dark p-5 text-white shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-primary/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/30">
                      {topicLabel}
                    </span>
                    <Megaphone className="h-4 w-4 shrink-0 text-primary/80" />
                  </div>
                  <h3 className="mt-4 font-display text-xl leading-snug">{bi(article.title)}</h3>
                  <p className="mt-2 text-sm text-white/80 line-clamp-3">{bi(article.content)}</p>
                  <dl className="mt-4 space-y-2 text-xs text-white/75">
                    <div className="flex justify-between gap-3">
                      <dt>{tr("admin_ann_creator")}</dt>
                      <dd className="font-medium text-white text-end">{creatorLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{L("Announcement", "إعلان")[lang]}</dt>
                      <dd className="font-medium text-white text-end line-clamp-2">{bi(article.title)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{tr("admin_ann_audience")}</dt>
                      <dd className="font-medium text-white">{audienceLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{tr("admin_ann_target_grade")}</dt>
                      <dd className="font-medium text-white">{gradeLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{tr("admin_ann_target_section")}</dt>
                      <dd className="font-medium text-white text-end">{sectionLabelText}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {tr("admin_ann_date")}
                      </dt>
                      <dd className="font-medium text-white">{dateLabel}</dd>
                    </div>
                  </dl>
                  <Link
                    to="/announcements/$slug"
                    params={{ slug: article.id }}
                    className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                  >
                    {tr("open")}
                    <ArrowRight className={`h-3.5 w-3.5 ${dir === "rtl" ? "rotate-180" : ""}`} />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
