import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { getVideo } from "@/lib/extras";
import { useCMS, ytId } from "@/lib/cms";

export const Route = createFileRoute("/videos/$slug")({
  loader: ({ params }) => ({ slug: params.slug }),
  head: () => ({ meta: [{ title: "Video — Ignite Islamic Academy" }] }),
  component: VideoDetail,
});

function VideoDetail() {
  const { slug } = Route.useLoaderData();
  const { tr, lang } = useI18n();
  const { videos } = useCMS();
  const builtIn = getVideo(slug);
  const custom = videos.find((v) => v.id === slug && v.published);
  const data = builtIn
    ? { title: builtIn.title, description: builtIn.description, grade: builtIn.grade, ytId: builtIn.youtubeId, duration: builtIn.duration }
    : custom
    ? { title: custom.title, description: custom.description, grade: { en: custom.grade, ar: custom.grade }, ytId: ytId(custom.youtubeUrl), duration: "" }
    : null;
  if (!data) return <div className="container-page py-20">Video not found.</div>;

  return (
    <PageShell
      eyebrow={data.grade[locale]}
      title={data.title[locale]}
      lead={data.description[locale]}
      crumbs={[{ label: tr("nav_videos"), to: "/videos" }, { label: data.title[locale] }]}
    >
      <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-[var(--shadow-elegant)]">
        <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${data.ytId}`} title={data.title[locale]} allowFullScreen />
      </div>
      {data.duration && <div className="mt-6 text-sm text-muted-foreground">Duration: {data.duration}</div>}
    </PageShell>
  );
}
