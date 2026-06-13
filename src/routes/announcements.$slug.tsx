import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { getAnnouncement } from "@/lib/extras";
import { useCMS } from "@/lib/cms";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/announcements/$slug")({
  loader: ({ params }) => ({ slug: params.slug }),
  head: () => ({ meta: [{ title: "Announcement — Ignite Islamic Academy" }] }),
  component: AnnouncementDetail,
});

function AnnouncementDetail() {
  const { slug } = Route.useLoaderData();
  const { tr, lang } = useI18n();
  const { articles } = useCMS();
  const builtIn = getAnnouncement(slug);
  const custom = articles.find((a) => a.id === slug && a.published && a.category === "announcement");
  const ann = builtIn ?? (custom ? {
    slug: custom.id,
    date: new Date(custom.createdAt).toLocaleDateString(),
    tag: { en: "News", ar: "خبر" },
    title: custom.title,
    excerpt: { en: "", ar: "" },
    body: custom.content,
    image: custom.imageUrl,
  } : null);
  if (!ann) return <div className="container-page py-20">Announcement not found.</div>;
  const image = (ann as { image?: string }).image;

  return (
    <PageShell eyebrow={ann.tag[lang]} title={ann.title[lang]}
      crumbs={[{ label: tr("nav_announcements"), to: "/announcements" }, { label: ann.title[lang] }]}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Calendar className="h-4 w-4 text-primary" /> {ann.date}
      </div>
      {image && <img src={image} alt={ann.title[lang]} className="w-full max-w-3xl rounded-2xl mb-6 border border-border" />}
      <article className="max-w-3xl">
        <p className="text-foreground/85 leading-relaxed text-lg whitespace-pre-line">{ann.body[lang]}</p>
      </article>
    </PageShell>
  );
}
