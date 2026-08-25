import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { EmptyState } from "@/components/empty-state";
import { Megaphone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAllAnnouncements } from "@/lib/cms";
import { useAnnouncementsContentPrefetch } from "@/hooks/use-cms-content-prefetch";
import { AnnouncementCard } from "@/components/announcement-card";
import { pageHeadTitle } from "@/lib/page-head";

export const Route = createFileRoute("/announcements/")({
  head: () => ({
    meta: [
      { title: pageHeadTitle("announcements") },
      { name: "description", content: "Latest news, events, exam schedules and competition updates from Ignite Islamic Academy." },
      { property: "og:title", content: "Announcements — Ignite Islamic Academy" },
      { property: "og:description", content: "School news, events and competitions from Ignite Islamic Academy." },
      { property: "og:url", content: "https://ignite-faith-learn.lovable.app/announcements" },
    ],
    links: [{ rel: "canonical", href: "https://ignite-faith-learn.lovable.app/announcements" }],
  }),
  component: AnnouncementsIndex,
});

function AnnouncementsIndex() {
  const { tr } = useI18n();
  const announcements = useAllAnnouncements();
  useAnnouncementsContentPrefetch(announcements);

  return (
    <PageShell
      eyebrow={tr("nav_announcements")}
      title={tr("ann_page_title")}
      lead={tr("ann_page_lead")}
      crumbs={[{ label: tr("nav_announcements") }]}
    >
      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title={tr("empty_announcements_title")} description={tr("empty_announcements_desc")} />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.slug} announcement={announcement} variant="light" />
          ))}
        </div>
      )}
    </PageShell>
  );
}
