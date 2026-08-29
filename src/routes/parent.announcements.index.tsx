import { createFileRoute, Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import { AnnouncementCard } from "@/components/announcement-card";
import { ParentWorkspacePageHeader } from "@/components/parent-workspace-page-header";
import { ParentGate } from "@/lib/parent-layout";
import { useI18n } from "@/lib/i18n";
import { useAllAnnouncements } from "@/lib/cms";
import { useAnnouncementsContentPrefetch } from "@/hooks/use-cms-content-prefetch";
import { PARENT_DASH_EMPTY } from "@/lib/parent-dashboard-ui";

export const Route = createFileRoute("/parent/announcements/")({
  head: () => ({
    meta: [
      { title: "Announcements — Parent Workspace" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ParentAnnouncementsRoute,
});

function ParentAnnouncementsRoute() {
  return (
    <ParentGate>
      <ParentAnnouncementsPage />
    </ParentGate>
  );
}

function ParentAnnouncementsPage() {
  const { tr } = useI18n();
  const announcements = useAllAnnouncements();
  useAnnouncementsContentPrefetch(announcements);

  return (
    <div>
      <ParentWorkspacePageHeader
        title={tr("parent_nav_announcements")}
        lead={tr("parent_workspace_announcements_lead")}
      />

      {announcements.length === 0 ? (
        <div className={PARENT_DASH_EMPTY}>
          <Megaphone className="h-3.5 w-3.5 shrink-0 text-foreground/45" aria-hidden />
          <span>{tr("empty_announcements_short")}</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.slug}
              announcement={announcement}
              variant="light"
              detailTo="/parent/announcements/$slug"
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-foreground/55">
        <Link to="/announcements" className="text-primary hover:underline">
          {tr("parent_workspace_public_announcements_link")}
        </Link>
      </p>
    </div>
  );
}
