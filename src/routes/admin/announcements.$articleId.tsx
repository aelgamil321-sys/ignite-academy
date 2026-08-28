import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useCMS } from "@/lib/cms";
import { useI18n, L } from "@/lib/i18n";
import { announcementTopicLabel, inferAnnouncementTopic } from "@/lib/announcement-topics";
import { fetchAnnouncementCreatorNames } from "@/lib/announcement-creator-names";
import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/admin/announcements/$articleId")({
  head: () => ({
    meta: [
      { title: "Announcement — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminAnnouncementViewPage,
});

function AdminAnnouncementViewPage() {
  const { articleId } = Route.useParams();
  const { articles, loading } = useCMS();
  const { lang, bi, tr } = useI18n();
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const article = articles.find((a) => a.id === articleId);

  useEffect(() => {
    if (!article?.createdBy) {
      setCreatorName(null);
      return;
    }
    void fetchAnnouncementCreatorNames([article.createdBy]).then((names) => {
      setCreatorName(names[article.createdBy!] ?? null);
    });
  }, [article?.createdBy]);

  const topic = article
    ? inferAnnouncementTopic(article.title, article.content, article.category)
    : null;

  return (
    <div className="space-y-6 min-w-0 max-w-3xl">
      <Link
        to="/admin"
        search={{ tab: "manage-announcements" }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {L("Back to Manage Announcements", "العودة إلى إدارة الإعلانات")[lang]}
      </Link>

      {loading ? (
        <p className="text-sm text-muted-foreground">{L("Loading…", "جارٍ التحميل…")[lang]}</p>
      ) : !article ? (
        <p className="text-sm text-destructive">{L("Announcement not found.", "الإعلان غير موجود.")[lang]}</p>
      ) : (
        <article className="space-y-5 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {topic ? announcementTopicLabel(topic) : tr("nav_announcements")}
            </p>
            <h1 className="font-display text-2xl text-foreground break-words">{bi(article.title)}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(article.createdAt).toLocaleDateString()}
              </span>
              <span>
                {article.published ? L("Published", "منشور")[lang] : L("Draft", "مسودة")[lang]}
              </span>
              {article.grade ? <span>{article.grade}</span> : null}
              {creatorName ? (
                <span>
                  {L("Created by", "أنشأه")[lang]}: {creatorName}
                </span>
              ) : null}
            </div>
          </div>
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt={bi(article.title)}
              className="w-full max-w-2xl rounded-xl border border-border"
            />
          ) : null}
          <p className="text-foreground/85 leading-relaxed whitespace-pre-line text-base">
            {bi(article.content)}
          </p>
        </article>
      )}
    </div>
  );
}
