import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import {
  assignmentFeedback,
  assignmentInstructions,
  assignmentTitle,
  fetchAssignmentById,
  statusBadgeClass,
  submitAssignmentWork,
  type AssignmentWithSubmission,
} from "@/lib/assignment";
import {
  ASSIGNMENT_SUBMISSION_ACCEPT,
  getAssignmentFileSignedUrl,
  uploadAssignmentSubmissionFile,
} from "@/lib/assignment-upload";
import { formatError } from "@/lib/upload";

export const Route = createFileRoute("/assignments/$assignmentId")({
  beforeLoad: () => blockParentFromStudentRoutes(),
  head: () => ({
    meta: [{ title: "Assignment — Ignite Islamic Academy" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AssignmentDetailPage,
});

function AssignmentDetailPage() {
  const { assignmentId } = Route.useParams();
  const navigate = useNavigate();
  const { tr, lang, bi } = useI18n();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [item, setItem] = useState<AssignmentWithSubmission | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState<string | null>(null);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const result = await fetchAssignmentById(assignmentId, uid);
    if (!result.assignment) {
      setItem(null);
      setLoading(false);
      return;
    }
    setItem(result.assignment);
    if (result.assignment.submission?.text_response) {
      setTextAnswer(result.assignment.submission.text_response);
    }
    if (result.assignment.attachment_path) {
      setAttachmentUrl(await getAssignmentFileSignedUrl(result.assignment.attachment_path));
    }
    if (result.assignment.submission?.file_path) {
      setSubmissionUrl(await getAssignmentFileSignedUrl(result.assignment.submission.file_path));
    }
    setLoading(false);
  }, [assignmentId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!active) return;
      if (!auth.user) {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }
      setUserId(auth.user.id);
      await load(auth.user.id);
    })();
    return () => {
      active = false;
    };
  }, [load, navigate]);

  const statusKey = item?.displayStatus ?? "missing";
  const statusText =
    statusKey === "graded"
      ? tr("assignment_status_graded")
      : statusKey === "submitted"
        ? tr("assignment_status_submitted")
        : statusKey === "late"
          ? tr("assignment_status_late")
          : tr("assignment_status_missing");

  const canSubmit = item && item.displayStatus !== "graded";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !item || !canSubmit) return;
    if (!textAnswer.trim() && !file && !item.submission) {
      toast.error(tr("assignment_submit_required"));
      return;
    }

    setSubmitting(true);
    try {
      let filePath = item.submission?.file_path ?? undefined;
      let fileName = item.submission?.file_name ?? undefined;
      let fileMime = item.submission?.file_mime ?? undefined;

      if (file) {
        const uploaded = await uploadAssignmentSubmissionFile(item.id, userId, file);
        filePath = uploaded.path;
        fileName = uploaded.name;
        fileMime = uploaded.mime;
      }

      const result = await submitAssignmentWork({
        assignmentId: item.id,
        textResponse: textAnswer.trim() || undefined,
        filePath,
        fileName,
        fileMime,
      });

      if (result.error) throw new Error(result.error);
      toast.success(tr("assignment_submit_success"));
      setFile(null);
      await load(userId);
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PageShell
        eyebrow={tr("nav_assignments")}
        title={tr("loading")}
        crumbs={[
          { label: tr("nav_assignments"), to: "/assignments" },
          { label: "…" },
        ]}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("loading")}
        </div>
      </PageShell>
    );
  }

  if (!item) {
    return (
      <PageShell
        eyebrow={tr("nav_assignments")}
        title={tr("assignment_not_found")}
        crumbs={[{ label: tr("nav_assignments"), to: "/assignments" }]}
      >
        <Link to="/assignments" className="text-sm text-primary font-semibold hover:underline">
          ← {tr("nav_assignments")}
        </Link>
      </PageShell>
    );
  }

  const formatDue = new Date(item.due_date).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <PageShell
      eyebrow={tr("nav_assignments")}
      title={bi(assignmentTitle(item))}
      crumbs={[
        { label: tr("nav_assignments"), to: "/assignments" },
        { label: bi(assignmentTitle(item)) },
      ]}
    >
      <div className="space-y-6 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-xs rounded-full px-2.5 py-1 font-semibold ${statusBadgeClass(item.displayStatus)}`}>
            {statusText}
          </span>
          <span className="text-sm text-muted-foreground">
            {tr("assignment_due_date")}: {formatDue}
          </span>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-lg text-foreground mb-3">{tr("assignment_instructions")}</h2>
          <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {bi(assignmentInstructions(item))}
          </div>
          {item.attachment_path && attachmentUrl && (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
            >
              <Paperclip className="h-4 w-4" />
              {item.attachment_name ?? tr("assignment_download_attachment")}
              <Download className="h-3.5 w-3.5 ms-1" />
            </a>
          )}
        </section>

        {item.displayStatus === "graded" && item.submission && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 md:p-6">
            <h2 className="font-display text-lg text-foreground mb-2">{tr("assignment_grade_feedback")}</h2>
            <p className="text-2xl font-display text-primary mb-3">
              {item.submission.score ?? "—"}
              {item.submission.max_points != null ? ` / ${item.submission.max_points}` : ""}
            </p>
            {(item.submission.feedback_en || item.submission.feedback_ar) && (
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                {bi(assignmentFeedback(item.submission))}
              </p>
            )}
          </section>
        )}

        {item.submission && (
          <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <h2 className="font-display text-lg text-foreground mb-3">{tr("assignment_your_submission")}</h2>
            {item.submission.text_response && (
              <p className="text-sm whitespace-pre-wrap text-foreground/90 mb-3">
                {item.submission.text_response}
              </p>
            )}
            {item.submission.file_path && submissionUrl && (
              <a
                href={submissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
              >
                <Paperclip className="h-4 w-4" />
                {item.submission.file_name ?? tr("assignment_download_submission")}
              </a>
            )}
          </section>
        )}

        {canSubmit && (
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="rounded-2xl border border-border bg-card p-5 md:p-6 space-y-4 shadow-[var(--shadow-soft)]"
          >
            <h2 className="font-display text-lg text-foreground">{tr("assignment_submit")}</h2>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="text-answer">
                {tr("assignment_text_answer")}
              </label>
              <textarea
                id="text-answer"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                placeholder={tr("assignment_text_placeholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="file-upload">
                {tr("assignment_file_upload")}
              </label>
              <input
                id="file-upload"
                type="file"
                accept={ASSIGNMENT_SUBMISSION_ACCEPT}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
              {file && (
                <p className="mt-1 text-xs text-muted-foreground">{file.name}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60 transition-colors"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {tr("assignment_submit")}
            </button>
          </form>
        )}
      </div>
    </PageShell>
  );
}
