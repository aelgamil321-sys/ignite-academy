import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Award, Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Bi } from "@/lib/curriculum";
import type { SavedQuizSubmission } from "@/lib/lesson-quiz";
import { downloadCertificatePdf } from "@/lib/certificate-pdf";
import { buildCertificateQrDataUrl } from "@/lib/certificate-qr";
import {
  buildCertificateDisplayData,
  getOrCreateQuizCertificate,
  resolveCertificateStudentNames,
  type QuizCertificateDisplayData,
} from "@/lib/quiz-certificate";
import {
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
  QuizCertificateDocument,
} from "@/components/quiz-certificate-document";
import {
  CERTIFICATE_EXPORT_ID,
  QuizCertificateExport,
} from "@/components/quiz-certificate-export";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const L = (en: string, ar: string) => ({ en, ar });

function validateCertificateInputs(
  submission: SavedQuizSubmission,
  gradeName: Bi,
  lessonTitle: Bi,
  displayData: QuizCertificateDisplayData | null,
): string[] {
  const missing: string[] = [];
  if (!submission?.id) missing.push("submission.id");
  if (!submission.lesson_id) missing.push("submission.lesson_id");
  if (submission.total_points == null) missing.push("submission.total_points");
  if (submission.percentage == null) missing.push("submission.percentage");
  if (!gradeName?.en?.trim() && !gradeName?.ar?.trim()) missing.push("gradeName");
  if (!lessonTitle?.en?.trim() && !lessonTitle?.ar?.trim()) missing.push("lessonTitle");
  if (!displayData) {
    missing.push("displayData");
    return missing;
  }
  if (!displayData.certificateId?.trim()) missing.push("certificateId");
  if (!displayData.studentName?.trim()) missing.push("studentName");
  if (!displayData.completionDate?.trim()) missing.push("completionDate");
  if (displayData.finalScore == null) missing.push("finalScore");
  if (!displayData.gradeLabelEn?.trim()) missing.push("gradeLabelEn");
  if (!displayData.gradeLabelAr?.trim()) missing.push("gradeLabelAr");
  return missing;
}

/** Responsive on-screen preview only — never used for PDF capture. */
function CertificatePreviewScaler({ data }: { data: QuizCertificateDisplayData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setScale(Math.min(1, w / CERTIFICATE_WIDTH_PX));
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [data]);

  const scaledHeight = CERTIFICATE_HEIGHT_PX * scale;

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div
        ref={containerRef}
        className="w-full max-w-full rounded-lg border border-border bg-muted/30 overflow-hidden"
        style={{ height: scaledHeight }}
      >
        <div
          style={{
            width: CERTIFICATE_WIDTH_PX,
            height: CERTIFICATE_HEIGHT_PX,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <QuizCertificateDocument data={data} />
        </div>
      </div>
    </div>
  );
}

/** Hidden #certificate-export — portaled to body, used only for PDF (never the modal). */
function CertificatePdfSource({
  data,
  pdfRef,
}: {
  data: QuizCertificateDisplayData;
  pdfRef: RefObject<HTMLDivElement | null>;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(<QuizCertificateExport ref={pdfRef} data={data} />, document.body);
}

export function QuizCertificateModal({
  open,
  onOpenChange,
  submission,
  gradeName,
  lessonTitle,
  lang,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: SavedQuizSubmission;
  gradeName: Bi;
  lessonTitle: Bi;
  lang: "en" | "ar";
}) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [displayData, setDisplayData] = useState<QuizCertificateDisplayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const prepareCertificate = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setPdfError(null);
    try {
      const inputMissing = validateCertificateInputs(submission, gradeName, lessonTitle, null);
      const inputOnly = inputMissing.filter((f) => f !== "displayData");
      if (inputOnly.length > 0) {
        throw new Error(`Missing required fields: ${inputOnly.join(", ")}`);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user?.id) throw new Error("Missing required fields: authenticated user (not signed in)");

      const studentNames = resolveCertificateStudentNames(user);

      const certificate = await getOrCreateQuizCertificate(submission);
      const built = buildCertificateDisplayData(
        submission,
        certificate,
        studentNames,
        gradeName,
        lessonTitle,
      );
      const qrDataUrl = await buildCertificateQrDataUrl(built.certificateId);
      const withQr = { ...built, qrDataUrl };

      const missing = validateCertificateInputs(submission, gradeName, lessonTitle, withQr);
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(", ")}`);
      }

      setDisplayData(withQr);
    } catch (error) {
      console.error("[certificate prepare]", error);
      const message =
        error instanceof Error ? error.message : "Could not load certificate";
      setLoadError(message);
      setDisplayData(null);
    } finally {
      setLoading(false);
    }
  }, [submission, gradeName, lessonTitle]);

  useEffect(() => {
    if (open) {
      void prepareCertificate();
    } else {
      setDisplayData(null);
      setLoadError(null);
      setPdfError(null);
    }
  }, [open, prepareCertificate]);

  const handleDownloadPdf = async () => {
    const el = pdfRef.current;
    if (!el || !displayData) {
      setPdfError(`PDF source element not found (#${CERTIFICATE_EXPORT_ID})`);
      return;
    }

    setDownloading(true);
    setPdfError(null);
    try {
      await downloadCertificatePdf(el, displayData.studentName);
      toast.success(L("Certificate downloaded", "تم تحميل الشهادة")[lang]);
    } catch (error) {
      console.error("[certificate pdf]", error);
      const message =
        error instanceof Error ? error.message : String(error);
      setPdfError(message);
      toast.error(message);
    } finally {
      setDownloading(false);
    }
  };

  const missingFields = displayData
    ? validateCertificateInputs(submission, gradeName, lessonTitle, displayData)
    : validateCertificateInputs(submission, gradeName, lessonTitle, null);

  return (
    <>
      {displayData && open && (
        <CertificatePdfSource data={displayData} pdfRef={pdfRef} />
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={[
            "fixed z-50 flex flex-col gap-3 p-4 sm:p-6",
            "left-[2.5vw] top-[5vh] translate-x-0 translate-y-0",
            "w-[95vw] max-w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden",
            "sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]",
            "sm:w-[95vw] sm:max-h-[90vh]",
          ].join(" ")}
        >
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Award className="h-5 w-5 text-emerald shrink-0" />
              {L("Certificate Preview", "معاينة الشهادة")[lang]}
            </DialogTitle>
            <DialogDescription>
              {L(
                "Review your certificate before downloading as PDF.",
                "راجع شهادتك قبل التحميل بصيغة PDF.",
              )[lang]}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {L("Preparing certificate…", "جارٍ تجهيز الشهادة…")[lang]}
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive space-y-2">
              <div className="font-semibold">
                {L("Certificate could not be loaded", "تعذر تحميل الشهادة")[lang]}
              </div>
              <div className="font-mono text-xs break-all">{loadError}</div>
              {missingFields.length > 0 && (
                <div className="text-xs">
                  {L("Missing fields", "الحقول الناقصة")[lang]}: {missingFields.join(", ")}
                </div>
              )}
            </div>
          ) : displayData ? (
            <div className="flex flex-col gap-4 min-h-0 w-full max-w-full overflow-x-hidden">
              <CertificatePreviewScaler data={displayData} />

              {downloading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating PDF...
                </div>
              )}

              {pdfError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive font-mono text-xs break-all">
                  {pdfError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 shrink-0 pt-1">
                <button
                  type="button"
                  disabled={downloading}
                  onClick={() => void handleDownloadPdf()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors disabled:opacity-50 flex-1"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloading ? "Generating PDF..." : "Download PDF / تحميل PDF"}
                </button>
                <button
                  type="button"
                  disabled={downloading}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold hover:border-emerald hover:text-emerald transition-colors flex-1 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Close / إغلاق
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {L("No certificate data available.", "لا توجد بيانات للشهادة.")[lang]}
              {missingFields.length > 0 && (
                <div className="mt-2 font-mono text-xs">
                  {L("Missing fields", "الحقول الناقصة")[lang]}: {missingFields.join(", ")}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function QuizCertificateButton({
  submission,
  gradeName,
  lessonTitle,
  lang,
}: {
  submission: SavedQuizSubmission;
  gradeName: Bi;
  lessonTitle: Bi;
  lang: "en" | "ar";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border-2 border-emerald bg-emerald/10 px-6 py-2.5 text-sm font-semibold text-emerald hover:bg-emerald hover:text-white transition-colors"
      >
        <Award className="h-4 w-4" />
        Download Certificate / تحميل الشهادة
      </button>
      <QuizCertificateModal
        open={open}
        onOpenChange={setOpen}
        submission={submission}
        gradeName={gradeName}
        lessonTitle={lessonTitle}
        lang={lang}
      />
    </>
  );
}
