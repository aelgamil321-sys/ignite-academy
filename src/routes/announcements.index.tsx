import { createFileRoute } from "@tanstack/react-router";
import { StudentOrPublicPage } from "@/components/student-or-public-page";
import { EmptyState } from "@/components/empty-state";
import { Megaphone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAllAnnouncements } from "@/lib/cms";
import { useAnnouncementsContentPrefetch } from "@/hooks/use-cms-content-prefetch";
import { AnnouncementCard } from "@/components/announcement-card";

import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/announcements/")({
  head: () =>
    publicPageHead({
      title: "Announcements — Ignite Islamic Academy",
      description:
        "Latest news, events, exam schedules and competition updates from Ignite Islamic Academy at Ignite School in Dubai, UAE.",
      path: "/announcements",
      ogTitle: "Announcements — Ignite Islamic Academy",
      ogDescription: "School news, events and competitions from Ignite Islamic Academy.",
    }),
  component: AnnouncementsIndex,
});

function AnnouncementsIndex() {
  const { tr } = useI18n();
  const announcements = useAllAnnouncements();
  useAnnouncementsContentPrefetch(announcements);

  return (
    <StudentOrPublicPage
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
    </StudentOrPublicPage>
  );
}
