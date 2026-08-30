import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AnnouncementArticleBody } from "@/components/announcement-article-body";
import { fetchTeacherReadableAnnouncement } from "@/lib/teacher-dashboard-announcements";
import type { Announcement } from "@/lib/extras";
import { useI18n } from "@/lib/i18n";
import { prefetchAnnouncementsContent } from "@/lib/cms-content-prefetch";
import { needsDynamicTranslation } from "@/lib/translate-educational-content";

export const Route = createFileRoute("/teacher/announcements/$slug")({
  loader: ({ params }) => ({ slug: params.slug }),
  head: () => ({
    meta: [
      { title: "Announcement — Teacher Workspace" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TeacherAnnouncementDetailPage,
});

function TeacherAnnouncementDetailPage() {
  const { slug } = Route.useLoaderData();
  const { tr, bi, dir, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void fetchTeacherReadableAnnouncement(slug)
      .then((result) => {
        if (!active) return;
        if (result.error) {
          setAnnouncement(null);
          setError(result.error);
          return;
        }
        setAnnouncement(result.announcement);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setAnnouncement(null);
        setError(err instanceof Error ? err.message : tr("teacher_dash_widget_load_error"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, reloadKey, tr]);

  useEffect(() => {
    if (!announcement || !needsDynamicTranslation(lang)) return;
    prefetchAnnouncementsContent(lang, [announcement]);
  }, [announcement, lang]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4">
      <Link
        to="/teacher"
        className={`inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline ${dir === "rtl" ? "flex-row-reverse" : ""}`}
      >
        <ArrowLeft className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
        {tr("teacher_workspace_back_dashboard")}
      </Link>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("teacher_loading")}
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
        <p className="py-10 text-sm text-muted-foreground">{tr("announcement_not_found")}</p>
      ) : (
        <>
          <h1 className="font-display text-2xl text-foreground break-words sm:text-3xl">
            {bi(announcement.title)}
          </h1>
          <AnnouncementArticleBody announcement={announcement} />
        </>
      )}
    </div>
  );
}
