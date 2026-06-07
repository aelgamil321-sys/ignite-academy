import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { getParentGuide } from "@/lib/extras";
import { useCMS } from "@/lib/cms";

export const Route = createFileRoute("/parent/$slug")({
  loader: ({ params }) => ({ slug: params.slug }),
  head: () => ({ meta: [{ title: "Parent Guide — Ignite Islamic Academy" }] }),
  component: ParentDetail,
});

function ParentDetail() {
  const { slug } = Route.useLoaderData();
  const { tr, lang } = useI18n();
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
  if (!guide) return <div className="container-page py-20">Guide not found.</div>;
  const image = (guide as { image?: string }).image;
  return (
    <PageShell eyebrow={tr("nav_parent")} title={guide.title[lang]} lead={guide.excerpt[lang]}
      crumbs={[{ label: tr("nav_parent"), to: "/parent" }, { label: guide.title[lang] }]}>
      {image && <img src={image} alt={guide.title[lang]} className="w-full max-w-3xl rounded-2xl mb-6 border border-border" />}
      <article className="prose max-w-3xl">
        <p className="text-foreground/85 leading-relaxed text-lg whitespace-pre-line">{guide.body[lang]}</p>
      </article>
    </PageShell>
  );
}
