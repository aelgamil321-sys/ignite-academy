import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { AnnouncementArticleBody } from "@/components/announcement-article-body";
import { fetchAnnouncementCreatorNames } from "@/lib/announcement-creator-names";
import { fetchAdminReadableAnnouncement } from "@/lib/teacher-dashboard-announcements";
import type { Announcement } from "@/lib/extras";
import { useI18n, L } from "@/lib/i18n";
import { prefetchAnnouncementsContent } from "@/lib/cms-content-prefetch";
import { needsDynamicTranslation } from "@/lib/translate-educational-content";

export const Route = createFileRoute("/admin/announcements/$articleId")({
  head: () => ({
    meta: [
      { title: "Announcement — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminAnnouncementViewPage,
});

function AdminAnnouncementViewPage() {
  const { articleId } = Route.useParams();
  const { lang, bi, tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCreatorName(null);
    void fetchAdminReadableAnnouncement(articleId)
      .then(async (result) => {
        if (!active) return;
        if (result.error) {
          setAnnouncement(null);
          setError(result.error);
          return;
        }
        setAnnouncement(result.announcement);
        if (result.createdBy) {
          const names = await fetchAnnouncementCreatorNames([result.createdBy]);
          if (active) setCreatorName(names[result.createdBy] ?? null);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setAnnouncement(null);
        setError(err instanceof Error ? err.message : tr("admin_content_loading"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [articleId, reloadKey, tr]);

  useEffect(() => {
    if (!announcement || !needsDynamicTranslation(lang)) return;
    prefetchAnnouncementsContent(lang, [announcement]);
  }, [announcement, lang]);

  return (
    <div className="space-y-6 min-w-0 max-w-3xl">
      <Link
        to="/admin"
        search={{ tab: "manage-announcements" }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {L("Back to Manage Announcements", "العودة إلى إدارة الإعلانات")[lang]}
      </Link>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {L("Loading…", "جارٍ التحميل…")[lang]}
        </div>
      ) : error ? (
        <div className="space-y-3 py-10">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {tr("teacher_perf_retry")}
          </button>
        </div>
      ) : !announcement ? (
        <p className="text-sm text-destructive">
          {L("Announcement not found.", "الإعلان غير موجود.")[lang]}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <h1 className="font-display text-2xl text-foreground break-words sm:text-3xl">
              {bi(announcement.title)}
            </h1>
            {creatorName ? (
              <p className="text-sm text-muted-foreground">
                {L("Created by", "أنشأه")[lang]}: {creatorName}
              </p>
            ) : null}
          </div>
          <AnnouncementArticleBody announcement={announcement} />
        </>
      )}
    </div>
  );
}
