import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { AnnouncementArticleBody } from "@/components/announcement-article-body";
import { ParentWorkspacePageHeader } from "@/components/parent-workspace-page-header";
import { ParentGate } from "@/lib/parent-layout";
import { useI18n } from "@/lib/i18n";
import { useCMS } from "@/lib/cms";
import { prefetchAnnouncementsContent } from "@/lib/cms-content-prefetch";
import { resolveAnnouncementBySlug } from "@/lib/parent-workspace-content";
import { needsDynamicTranslation } from "@/lib/translate-educational-content";
import { PARENT_DASH_EMPTY } from "@/lib/parent-dashboard-ui";

export const Route = createFileRoute("/parent/announcements/$slug")({
  loader: ({ params }) => ({ slug: params.slug }),
  head: () => ({
    meta: [
      { title: "Announcement — Parent Workspace" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ParentAnnouncementDetailRoute,
});

function ParentAnnouncementDetailRoute() {
  return (
    <ParentGate>
      <ParentAnnouncementDetailPage />
    </ParentGate>
  );
}

function ParentAnnouncementDetailPage() {
  const { slug } = Route.useLoaderData();
  const { tr, lang, bi, dir } = useI18n();
  const { articles } = useCMS();
  const announcement = resolveAnnouncementBySlug(slug, articles);

  useEffect(() => {
    if (!announcement || !needsDynamicTranslation(lang)) return;
    prefetchAnnouncementsContent(lang, [announcement]);
  }, [announcement, lang]);

  if (!announcement) {
    return (
      <div>
        <Link
          to="/parent/announcements"
          className={`mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline ${dir === "rtl" ? "flex-row-reverse" : ""}`}
        >
          <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
          {tr("parent_workspace_back_announcements")}
        </Link>
        <div className={PARENT_DASH_EMPTY}>
          <span>{tr("announcement_not_found")}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/parent/announcements"
        className={`mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline ${dir === "rtl" ? "flex-row-reverse" : ""}`}
      >
        <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
        {tr("parent_workspace_back_announcements")}
      </Link>
      <ParentWorkspacePageHeader title={bi(announcement.title)} />
      <AnnouncementArticleBody announcement={announcement} />
    </div>
  );
}
