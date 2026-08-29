import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { StudentOrPublicPage } from "@/components/student-or-public-page";
import { useI18n } from "@/lib/i18n";
import { getAnnouncement } from "@/lib/extras";
import { useCMS } from "@/lib/cms";
import { announcementTopicLabel, inferAnnouncementTopic } from "@/lib/announcement-topics";
import { prefetchAnnouncementsContent } from "@/lib/cms-content-prefetch";
import { needsDynamicTranslation } from "@/lib/translate-educational-content";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/announcements/$slug")({
  loader: ({ params }) => ({ slug: params.slug }),
  head: () => ({ meta: [{ title: "Announcement — Ignite Islamic Academy" }] }),
  component: AnnouncementDetail,
});

function AnnouncementDetail() {
  const { slug } = Route.useLoaderData();
  const { tr, lang, bi } = useI18n();
  const { articles } = useCMS();
  const builtIn = getAnnouncement(slug);
  const custom = articles.find((a) => a.id === slug && a.published && a.category === "announcement");
  const ann = builtIn ?? (custom ? {
    slug: custom.id,
    createdAt: custom.createdAt,
    date: new Date(custom.createdAt).toLocaleDateString(),
    topic: inferAnnouncementTopic(custom.title, custom.content, custom.category),
    tag: announcementTopicLabel(inferAnnouncementTopic(custom.title, custom.content, custom.category)),
    title: custom.title,
    excerpt: { en: custom.content.en.slice(0, 160), ar: custom.content.ar.slice(0, 160) },
    body: custom.content,
    imageUrl: custom.imageUrl,
  } : null);

  useEffect(() => {
    if (!ann || !needsDynamicTranslation(lang)) return;
    prefetchAnnouncementsContent(lang, [ann]);
  }, [ann, lang]);

  if (!ann) return <div className="container-page py-20">{tr("announcement_not_found")}</div>;
  const image = ann.imageUrl;

  return (
    <StudentOrPublicPage
      eyebrow={bi(ann.tag)}
      title={bi(ann.title)}
      crumbs={[{ label: tr("nav_announcements"), to: "/announcements" }, { label: bi(ann.title) }]}
    >
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4 text-primary" /> {ann.date}
      </div>
      {image && <img src={image} alt={bi(ann.title)} className="mb-6 w-full max-w-3xl rounded-2xl border border-border" />}
      <article className="max-w-3xl">
        <p className="whitespace-pre-line text-lg leading-relaxed text-foreground/85">{bi(ann.body)}</p>
      </article>
    </StudentOrPublicPage>
  );
}
