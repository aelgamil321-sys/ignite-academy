import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import { Award, Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Bi } from "@/lib/curriculum";
import type { SavedQuizSubmission } from "@/lib/lesson-quiz";
import {
  buildCertificateDisplayData,
  CERTIFICATE_PROFILE_INCOMPLETE_MESSAGE,
  downloadCertificatePdf,
  getOrCreateQuizCertificate,
  isStudentProfileComplete,
  resolveCertificateStudentNames,
  type CertificateDisplayData,
} from "@/lib/certificate";
import { fetchStudentProfile } from "@/lib/student-profile";
import { buildCertificateQrDataUrl } from "@/lib/certificate-qr";
import {
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
  CertificateDocument,
} from "@/components/certificate-document";
import {
  CERTIFICATE_EXPORT_ID,
  CertificateExport,
} from "@/components/certificate-export";
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
  displayData: CertificateDisplayData | null,
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
function CertificatePreviewScaler({ data }: { data: CertificateDisplayData }) {
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
  const scaledWidth = CERTIFICATE_WIDTH_PX * scale;

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div
        ref={containerRef}
        className="w-full max-w-full mx-auto overflow-hidden rounded-lg border border-border bg-muted/30"
        style={{ height: scaledHeight }}
      >
        <div
          className="mx-auto overflow-hidden"
          style={{
            width: scaledWidth,
            height: scaledHeight,
          }}
        >
          <div
            style={{
              width: CERTIFICATE_WIDTH_PX,
              height: CERTIFICATE_HEIGHT_PX,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <CertificateDocument data={data} />
          </div>
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
  data: CertificateDisplayData;
  pdfRef: RefObject<HTMLDivElement | null>;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(<CertificateExport ref={pdfRef} data={data} />, document.body);
}

export function CertificateModal({
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
  const [displayData, setDisplayData] = useState<CertificateDisplayData | null>(null);
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

      const profile = await fetchStudentProfile(user.id);
      if (!isStudentProfileComplete(profile)) {
        throw new Error(CERTIFICATE_PROFILE_INCOMPLETE_MESSAGE);
      }

      const studentNames = resolveCertificateStudentNames(profile);

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
            "flex flex-col gap-3 p-4 sm:p-6",
            "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-[95vw] max-w-[420px] max-h-[90vh] overflow-hidden",
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
                {loadError === CERTIFICATE_PROFILE_INCOMPLETE_MESSAGE
                  ? CERTIFICATE_PROFILE_INCOMPLETE_MESSAGE
                  : L("Certificate could not be loaded", "تعذر تحميل الشهادة")[lang]}
              </div>
              {loadError !== CERTIFICATE_PROFILE_INCOMPLETE_MESSAGE && (
                <div className="font-mono text-xs break-all">{loadError}</div>
              )}
              {loadError === CERTIFICATE_PROFILE_INCOMPLETE_MESSAGE && (
                <Link
                  to="/student/profile"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors"
                >
                  {L("Complete profile", "إكمال الملف الشخصي")[lang]}
                </Link>
              )}
              {missingFields.length > 0 && loadError !== CERTIFICATE_PROFILE_INCOMPLETE_MESSAGE && (
                <div className="text-xs">
                  {L("Missing fields", "الحقول الناقصة")[lang]}: {missingFields.join(", ")}
                </div>
              )}
            </div>
          ) : displayData ? (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full max-w-full">
                <div className="flex flex-col gap-4 w-full max-w-full">
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
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0 pt-1 w-full">
                <button
                  type="button"
                  disabled={downloading}
                  onClick={() => void handleDownloadPdf()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors disabled:opacity-50 w-full"
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
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold hover:border-emerald hover:text-emerald transition-colors w-full disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Close / إغلاق
                </button>
              </div>
            </>
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

/** Platform default certificate trigger — uses the global CertificatePageBody template. */
export function CertificateButton({
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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleOpen = async () => {
    setChecking(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) {
        toast.error(L("Please sign in to download your certificate.", "يرجى تسجيل الدخول لتحميل الشهادة.")[lang]);
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }

      const profile = await fetchStudentProfile(user.id);
      if (!isStudentProfileComplete(profile)) {
        toast.error(CERTIFICATE_PROFILE_INCOMPLETE_MESSAGE, {
          action: {
            label: L("Profile", "الملف الشخصي")[lang],
            onClick: () => navigate({ to: "/student/profile" }),
          },
        });
        return;
      }

      setOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={checking}
        onClick={() => void handleOpen()}
        className="inline-flex items-center gap-2 rounded-full border-2 border-emerald bg-emerald/10 px-6 py-2.5 text-sm font-semibold text-emerald hover:bg-emerald hover:text-white transition-colors disabled:opacity-60"
      >
        {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
        {checking ? "Checking profile… / جارٍ التحقق…" : "Download Certificate / تحميل الشهادة"}
      </button>
      <CertificateModal
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
