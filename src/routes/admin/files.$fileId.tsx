import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Download, ExternalLink } from "lucide-react";
import { useCMS } from "@/lib/cms";
import { useI18n, L } from "@/lib/i18n";
import { gradeDisplayName } from "@/lib/grade-utils";
import { fetchAnnouncementCreatorNames } from "@/lib/announcement-creator-names";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/files/$fileId")({
  head: () => ({
    meta: [
      { title: "File — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminFileViewPage,
});

function AdminFileViewPage() {
  const { fileId } = Route.useParams();
  const { files, loading } = useCMS();
  const { lang, bi } = useI18n();
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const file = files.find((f) => f.id === fileId);

  useEffect(() => {
    if (!file?.createdBy) {
      setCreatorName(null);
      return;
    }
    void fetchAnnouncementCreatorNames([file.createdBy]).then((names) => {
      setCreatorName(names[file.createdBy!] ?? null);
    });
  }, [file?.createdBy]);

  return (
    <div className="space-y-6 min-w-0 max-w-3xl">
      <Link
        to="/admin"
        search={{ tab: "manage-resources" }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {L("Back to Manage Resources", "العودة إلى إدارة الموارد")[lang]}
      </Link>

      {loading ? (
        <p className="text-sm text-muted-foreground">{L("Loading…", "جارٍ التحميل…")[lang]}</p>
      ) : !file ? (
        <p className="text-sm text-destructive">{L("File not found.", "الملف غير موجود.")[lang]}</p>
      ) : (
        <div className="space-y-5 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <h1 className="font-display text-2xl text-foreground break-words">{bi(file.title)}</h1>
            <p className="text-sm text-muted-foreground break-words">
              {file.type.toUpperCase()} · {file.size} · {file.fileName}
            </p>
            <p className="text-sm text-muted-foreground">
              {gradeDisplayName(file.grade, lang)}
              {" · "}
              {bi(file.unit) || "—"}
              {" · "}
              {file.published ? L("Published", "منشور")[lang] : L("Draft", "مسودة")[lang]}
              {creatorName ? ` · ${creatorName}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={file.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
            >
              <ExternalLink className="h-4 w-4" />
              {L("Open file", "فتح الملف")[lang]}
            </a>
            <a
              href={file.fileUrl}
              download={file.fileName}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
            >
              <Download className="h-4 w-4" />
              {L("Download", "تنزيل")[lang]}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
