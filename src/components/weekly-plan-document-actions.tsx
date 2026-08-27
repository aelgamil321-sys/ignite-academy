import { Download, Eye, Loader2, Printer, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { WeeklyPlanPrintDocument } from "@/components/weekly-plan-print-document";
import { useI18n } from "@/lib/i18n";
import {
  buildWeeklyPlanDocumentModel,
  WEEKLY_PLAN_PDF_EXPORT_ID,
  type WeeklyPlanDocumentModel,
} from "@/lib/weekly-plan-document-model";
import { printWeeklyPlanNative, waitForWeeklyPlanDocumentReady } from "@/lib/weekly-plan-pdf";
import type { WeeklyPlanRow } from "@/lib/weekly-planning";

export function WeeklyPlanDocumentActions({
  plan,
  planId,
  teacherDisplayName,
}: {
  plan: WeeklyPlanRow;
  planId: string;
  teacherDisplayName: string;
}) {
  const { tr } = useI18n();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const pdfMountRef = useRef<HTMLDivElement>(null);

  const documentModel = useMemo(
    () => buildWeeklyPlanDocumentModel(plan, { teacherDisplayName }),
    [plan, teacherDisplayName],
  );

  const getExportElement = useCallback((): HTMLElement | null => {
    const root = pdfMountRef.current;
    if (!root) return null;
    return root.querySelector(`#${WEEKLY_PLAN_PDF_EXPORT_ID}`) as HTMLElement | null;
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const el = getExportElement();
      if (!el) throw new Error("Document not ready");
      await waitForWeeklyPlanDocumentReady(el);
      await printWeeklyPlanNative(el);
      toast.success(tr("wp_pdf_downloaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div
        ref={pdfMountRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: "1123px",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        <WeeklyPlanPrintDocument model={documentModel} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
        >
          <Eye className="h-4 w-4" />
          {tr("wp_action_preview_pdf")}
        </button>
        <button
          type="button"
          disabled={downloading}
          onClick={() => void handleDownload()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {tr("wp_action_download_pdf")}
        </button>
        <Link
          to="/teacher/weekly-planning/$planId/print"
          params={{ planId }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Printer className="h-4 w-4" />
          {tr("wp_action_print")}
        </Link>
      </div>

      {previewOpen ? (
        <WeeklyPlanPreviewOverlay
          model={documentModel}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}

function WeeklyPlanPreviewOverlay({
  model,
  onClose,
}: {
  model: WeeklyPlanDocumentModel;
  onClose: () => void;
}) {
  const { tr } = useI18n();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const available = window.innerWidth - 32;
      setScale(Math.min(1, available / 1123));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
        <span className="text-sm font-semibold text-foreground">{tr("wp_preview_title")}</span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <X className="h-4 w-4" />
          {tr("wp_preview_close")}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 flex justify-center items-start">
        <div
          style={{
            width: "297mm",
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            marginBottom: scale < 1 ? `${(1 - scale) * -100}%` : 0,
          }}
        >
          <WeeklyPlanPrintDocument model={model} />
        </div>
      </div>
    </div>
  );
}
