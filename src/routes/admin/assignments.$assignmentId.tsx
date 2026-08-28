import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Download, Loader2 } from "lucide-react";
import { useI18n, L } from "@/lib/i18n";
import { localeForFormatting } from "@/lib/i18n-config";
import {
  assignmentInstructions,
  assignmentTitle,
  fetchAssignmentById,
  type AssignmentRow,
} from "@/lib/assignment";
import { getAssignmentFileSignedUrl } from "@/lib/assignment-upload";
import { fetchAnnouncementCreatorNames } from "@/lib/announcement-creator-names";

export const Route = createFileRoute("/admin/assignments/$assignmentId")({
  head: () => ({
    meta: [
      { title: "Assignment — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminAssignmentViewPage,
});

function AdminAssignmentViewPage() {
  const { assignmentId } = Route.useParams();
  const { lang, bi } = useI18n();
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const result = await fetchAssignmentById(assignmentId);
      if (!active) return;
      if (!result.assignment) {
        setAssignment(null);
        setLoading(false);
        return;
      }
      const row = result.assignment;
      setAssignment(row);
      if (row.attachment_path) {
        setAttachmentUrl(await getAssignmentFileSignedUrl(row.attachment_path));
      }
      if (row.created_by) {
        const names = await fetchAnnouncementCreatorNames([row.created_by]);
        setCreatorName(names[row.created_by] ?? null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [assignmentId]);

  return (
    <div className="space-y-6 min-w-0 max-w-3xl">
      <Link
        to="/admin/assignments"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {L("Back to Assignments", "العودة إلى الواجبات")[lang]}
      </Link>

      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {L("Loading…", "جارٍ التحميل…")[lang]}
        </p>
      ) : !assignment ? (
        <p className="text-sm text-destructive">{L("Assignment not found.", "الواجب غير موجود.")[lang]}</p>
      ) : (
        <div className="space-y-5 rounded-xl border border-border bg-card p-6">
          <div className="space-y-2">
            <h1 className="font-display text-2xl text-foreground break-words">{bi(assignmentTitle(assignment))}</h1>
            <div className="text-sm text-muted-foreground space-y-1 break-words">
              <p>
                {L("Grade", "الصف")[lang]}: {assignment.grade}
                {assignment.section ? ` · ${assignment.section}` : ""}
                {assignment.islamic_group ? ` · ${assignment.islamic_group}` : ""}
              </p>
              <p>
                {L("Due", "الاستحقاق")[lang]}:{" "}
                {new Date(assignment.due_date).toLocaleString(localeForFormatting(lang))}
              </p>
              <p>
                {L("Status", "الحالة")[lang]}:{" "}
                {assignment.published ? L("Published", "منشور")[lang] : L("Draft", "مسودة")[lang]}
              </p>
              <p>
                {L("Max points", "الدرجة القصوى")[lang]}: {assignment.max_points}
              </p>
              {creatorName ? (
                <p>
                  {L("Created by", "أنشأه")[lang]}: {creatorName}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">
              {L("Instructions", "التعليمات")[lang]}
            </h2>
            <p className="text-sm text-foreground/85 whitespace-pre-line leading-relaxed">
              {bi(assignmentInstructions(assignment))}
            </p>
          </div>

          {attachmentUrl ? (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
            >
              <Download className="h-4 w-4" />
              {assignment.attachment_name ?? L("Download attachment", "تنزيل المرفق")[lang]}
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
