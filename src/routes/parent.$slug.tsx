import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { getParentGuide } from "@/lib/extras";
import { useCMS } from "@/lib/cms";

import { privateRouteHead } from "@/lib/seo";

export const Route = createFileRoute("/parent/$slug")({
  loader: ({ params }) => ({ slug: params.slug }),
  head: () => privateRouteHead("Parent Guide — Ignite Islamic Academy"),
  component: ParentDetail,
});

function ParentDetail() {
  const { slug } = Route.useLoaderData();
  const { tr, lang, bi } = useI18n();
  const { articles } = useCMS();
  const builtIn = getParentGuide(slug);
  const custom = articles.find((a) => a.id === slug && a.published && a.category === "parent");
  const guide = builtIn ?? (custom ? {
    slug: custom.id,
    title: custom.title,
    excerpt: { en: "", ar: "" },
    body: custom.content,
    image: custom.imageUrl,
  } : null);
  if (!guide) return <div className="container-page py-20">{tr("guide_not_found")}</div>;
  const image = (guide as { image?: string }).image;
  return (
    <PageShell eyebrow={tr("nav_parent")} title={bi(guide.title)} lead={bi(guide.excerpt)}
      crumbs={[{ label: tr("nav_parent"), to: "/parent" }, { label: bi(guide.title) }]}>
      {image && <img src={image} alt={bi(guide.title)} className="w-full max-w-3xl rounded-2xl mb-6 border border-border" />}
      <article className="prose max-w-3xl">
        <p className="text-foreground/85 leading-relaxed text-lg whitespace-pre-line">{bi(guide.body)}</p>
      </article>
    </PageShell>
  );
}
