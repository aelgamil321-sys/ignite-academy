import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import {
  fetchAssignmentStorageFileMeta,
  formatAssignmentFileSize,
  formatAssignmentFileTypeLabel,
  isImageMime,
  isPdfMime,
  isPreviewableAssignmentFile,
  requestAssignmentFileSignedUrl,
  resolveAssignmentFileMime,
  type AssignmentFileAccessError,
} from "@/lib/assignment-upload";

type Props = {
  filePath: string | null;
  fileName: string | null;
  fileMime: string | null;
};

function accessErrorMessage(
  error: AssignmentFileAccessError,
  tr: (key: import("@/lib/i18n").TKey) => string,
  detail?: string,
): string {
  switch (error) {
    case "not_found":
      return tr("assignment_file_not_found");
    case "permission_denied":
      return tr("assignment_file_permission_denied");
    case "missing_path":
      return tr("assignment_file_not_found");
    default:
      return detail ? `${tr("assignment_file_signed_url_failed")}: ${detail}` : tr("assignment_file_signed_url_failed");
  }
}

export function AdminAssignmentSubmissionFile({ filePath, fileName, fileMime }: Props) {
  const { tr, lang } = useI18n();
  const displayLang = lang === "ar" ? "ar" : "en";
  const mime = resolveAssignmentFileMime(fileMime, fileName);
  const typeLabel = formatAssignmentFileTypeLabel(mime, fileName, displayLang);
  const canPreview = isPreviewableAssignmentFile(mime);

  const [fileSize, setFileSize] = useState<number | null>(null);
  const [sizeLoading, setSizeLoading] = useState(false);
  const [action, setAction] = useState<"preview" | "open" | "download" | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) return;
    let active = true;
    setSizeLoading(true);
    void fetchAssignmentStorageFileMeta(filePath).then(({ size, error }) => {
      if (!active) return;
      if (error) console.warn("[assignment file meta]", error);
      setFileSize(size);
      setSizeLoading(false);
    });
    return () => {
      active = false;
    };
  }, [filePath]);

  const requestUrl = useCallback(async (): Promise<string> => {
    const result = await requestAssignmentFileSignedUrl(filePath);
    if (!result.ok) {
      const message = accessErrorMessage(result.error, tr, result.message);
      setInlineError(message);
      toast.error(message);
      throw new Error(message);
    }
    setInlineError(null);
    return result.url;
  }, [filePath, tr]);

  async function handleDownload() {
    setAction("download");
    try {
      const url = await requestUrl();
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName?.trim() || "assignment-submission";
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      // toast + inline error already set
    } finally {
      setAction(null);
    }
  }

  async function handleOpenInTab() {
    setAction("open");
    try {
      const url = await requestUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // handled
    } finally {
      setAction(null);
    }
  }

  async function handlePreview() {
    if (!canPreview) {
      await handleDownload();
      return;
    }

    setAction("preview");
    try {
      const url = await requestUrl();
      setPreviewUrl(url);
      setPreviewOpen(true);
    } catch {
      // handled
    } finally {
      setAction(null);
    }
  }

  if (!filePath && !fileName) return null;

  const busy = action !== null;

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {tr("assignment_submitted_file")}
          </div>
          <div className="font-medium text-sm text-foreground break-all">
            {fileName?.trim() || filePath || "—"}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex gap-2">
              <dt className="font-medium">{tr("assignment_file_type")}:</dt>
              <dd>{typeLabel}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">{tr("assignment_file_size")}:</dt>
              <dd>
                {sizeLoading
                  ? tr("loading")
                  : formatAssignmentFileSize(fileSize, displayLang)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {inlineError && (
        <p className="text-xs text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          {inlineError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {canPreview && (
          <button
            type="button"
            disabled={busy || !filePath}
            onClick={() => void handlePreview()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-60 transition-colors"
          >
            {action === "preview" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {isImageMime(mime) ? tr("assignment_file_preview") : tr("assignment_file_preview")}
          </button>
        )}
        {!canPreview && (
          <button
            type="button"
            disabled={busy || !filePath}
            onClick={() => void handleOpenInTab()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-primary hover:text-primary disabled:opacity-60 transition-colors"
          >
            {action === "open" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" />
            )}
            {tr("assignment_file_open")}
          </button>
        )}
        <button
          type="button"
          disabled={busy || !filePath}
          onClick={() => void handleDownload()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-60 transition-colors"
        >
          {action === "download" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {tr("assignment_file_download")}
        </button>
      </div>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) setPreviewUrl(null);
        }}
      >
        <DialogContent className="max-w-4xl w-[min(96vw,56rem)] max-h-[92vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-start truncate pe-8">
              {tr("assignment_file_preview_title")}
              {fileName ? ` — ${fileName}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-border bg-muted/30">
            {previewUrl && isImageMime(mime) && (
              <img
                src={previewUrl}
                alt={fileName ?? tr("assignment_file_preview")}
                className="mx-auto max-h-[min(70vh,640px)] w-auto max-w-full object-contain p-2"
              />
            )}
            {previewUrl && isPdfMime(mime) && (
              <iframe
                title={fileName ?? tr("assignment_file_preview")}
                src={previewUrl}
                className="h-[min(70vh,640px)] w-full bg-white"
              />
            )}
          </div>
          <div className="flex flex-wrap gap-2 justify-end pt-2">
            {previewUrl && (
              <button
                type="button"
                onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-primary hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {tr("assignment_file_open")}
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"
            >
              <Download className="h-3.5 w-3.5" />
              {tr("assignment_file_download")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
