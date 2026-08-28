import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useCMS, ytId } from "@/lib/cms";
import { useI18n, L } from "@/lib/i18n";
import { gradeDisplayName } from "@/lib/grade-utils";
import { fetchAnnouncementCreatorNames } from "@/lib/announcement-creator-names";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/videos/$videoId")({
  head: () => ({
    meta: [
      { title: "Video — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminVideoViewPage,
});

function AdminVideoViewPage() {
  const { videoId } = Route.useParams();
  const { videos, loading } = useCMS();
  const { lang, bi } = useI18n();
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const video = videos.find((v) => v.id === videoId);

  useEffect(() => {
    if (!video?.createdBy) {
      setCreatorName(null);
      return;
    }
    void fetchAnnouncementCreatorNames([video.createdBy]).then((names) => {
      setCreatorName(names[video.createdBy!] ?? null);
    });
  }, [video?.createdBy]);

  return (
    <div className="space-y-6 min-w-0 max-w-4xl">
      <Link
        to="/admin"
        search={{ tab: "manage-announcements" }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {L("Back to Manage Resources", "العودة إلى إدارة الموارد")[lang]}
      </Link>

      {loading ? (
        <p className="text-sm text-muted-foreground">{L("Loading…", "جارٍ التحميل…")[lang]}</p>
      ) : !video ? (
        <p className="text-sm text-destructive">{L("Video not found.", "الفيديو غير موجود.")[lang]}</p>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="font-display text-2xl text-foreground break-words">{bi(video.title)}</h1>
            <p className="text-sm text-muted-foreground">
              {gradeDisplayName(video.grade, lang)}
              {" · "}
              {video.published ? L("Published", "منشور")[lang] : L("Draft", "مسودة")[lang]}
              {creatorName ? ` · ${creatorName}` : ""}
            </p>
            {bi(video.description) ? (
              <p className="text-sm text-foreground/85">{bi(video.description)}</p>
            ) : null}
          </div>
          <div className="aspect-video w-full max-w-full rounded-2xl overflow-hidden border border-border">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${ytId(video.youtubeUrl)}`}
              title={bi(video.title)}
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
