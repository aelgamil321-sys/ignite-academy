import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { getAnnouncement } from "@/lib/extras";
import { useCMS } from "@/lib/cms";
import { announcementTopicLabel, inferAnnouncementTopic } from "@/lib/announcement-topics";
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
  if (!ann) return <div className="container-page py-20">{tr("announcement_not_found")}</div>;
  const image = ann.imageUrl;

  return (
    <PageShell eyebrow={bi(ann.tag)} title={bi(ann.title)}
      crumbs={[{ label: tr("nav_announcements"), to: "/announcements" }, { label: bi(ann.title) }]}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Calendar className="h-4 w-4 text-primary" /> {ann.date}
      </div>
      {image && <img src={image} alt={bi(ann.title)} className="w-full max-w-3xl rounded-2xl mb-6 border border-border" />}
      <article className="max-w-3xl">
        <p className="text-foreground/85 leading-relaxed text-lg whitespace-pre-line">{bi(ann.body)}</p>
      </article>
    </PageShell>
  );
}
