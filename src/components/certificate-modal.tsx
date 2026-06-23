import { L } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import { Award, Download, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Bi } from "@/lib/curriculum";
import type { Lang } from "@/lib/i18n-config";
import type { SavedQuizSubmission } from "@/lib/lesson-quiz";
import {
  buildCertificateDisplayData,
  getOrCreateQuizCertificate,
  isStudentProfileComplete,
  loadLinkedChildCertificatePreview,
  renderCertificatePdfBlob,
  resolveCertificateStudentNames,
  safeCertificateFilename,
  triggerCertificatePdfDownload,
  type CertificateDisplayData,
} from "@/lib/certificate";
import { fetchStudentProfile } from "@/lib/student-profile";
import { buildCertificateQrDataUrl } from "@/lib/certificate-qr";
import { CERTIFICATE_EXPORT_ID, CertificateExport } from "@/components/certificate-export";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function certificateProfileIncompleteText(lang: Lang): string {
  return L(
    "Please complete your profile before generating certificates.",
    "يرجى إكمال ملفك الشخصي قبل إنشاء الشهادات.",
  )[lang];
}

function missingRequiredFieldsText(lang: Lang, fields: string[]): string {
  return `${L("Missing required fields", "الحقول المطلوبة ناقصة")[lang]}: ${fields.join(", ")}`;
}

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

function parentCertificateLoadErrorText(lang: Lang): string {
  return L(
    "The certificate could not be loaded. Please try again.",
    "تعذر تحميل الشهادة. حاول مرة أخرى.",
  )[lang];
}

export function CertificateModal({
  open,
  onOpenChange,
  lang,
  parentView,
  submission,
  gradeName,
  lessonTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  parentView?: { certificateId: string; studentUserId: string };
  submission?: SavedQuizSubmission;
  gradeName?: Bi;
  lessonTitle?: Bi;
}) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [displayData, setDisplayData] = useState<CertificateDisplayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [buildingPdf, setBuildingPdf] = useState(false);

  const prepareCertificate = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setPdfError(null);
    try {
      let activeSubmission: SavedQuizSubmission;
      let activeGradeName: Bi;
      let activeLessonTitle: Bi;
      let certificateRecord;

      if (parentView) {
        const loaded = await loadLinkedChildCertificatePreview(
          parentView.certificateId,
          parentView.studentUserId,
        );
        activeSubmission = loaded.submission;
        activeGradeName = loaded.gradeName;
        activeLessonTitle = loaded.lessonTitle;
        certificateRecord = loaded.certificate;

        const inputMissing = validateCertificateInputs(
          activeSubmission,
          activeGradeName,
          activeLessonTitle,
          null,
        );
        const inputOnly = inputMissing.filter((f) => f !== "displayData");
        if (inputOnly.length > 0) {
          throw new Error(missingRequiredFieldsText(lang, inputOnly));
        }

        const built = buildCertificateDisplayData(
          activeSubmission,
          certificateRecord,
          loaded.studentNames,
          activeGradeName,
          activeLessonTitle,
        );
        const qrDataUrl = await buildCertificateQrDataUrl(built.certificateId);
        const withQr = { ...built, qrDataUrl };

        const missing = validateCertificateInputs(
          activeSubmission,
          activeGradeName,
          activeLessonTitle,
          withQr,
        );
        if (missing.length > 0) {
          throw new Error(missingRequiredFieldsText(lang, missing));
        }

        setDisplayData(withQr);
        return;
      }

      if (!submission || !gradeName || !lessonTitle) {
        throw new Error(missingRequiredFieldsText(lang, ["submission", "gradeName", "lessonTitle"]));
      }

      activeSubmission = submission;
      activeGradeName = gradeName;
      activeLessonTitle = lessonTitle;

      const inputMissing = validateCertificateInputs(
        activeSubmission,
        activeGradeName,
        activeLessonTitle,
        null,
      );
      const inputOnly = inputMissing.filter((f) => f !== "displayData");
      if (inputOnly.length > 0) {
        throw new Error(missingRequiredFieldsText(lang, inputOnly));
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user?.id) {
        throw new Error(
          L(
            "Missing required fields: authenticated user (not signed in)",
            "الحقول المطلوبة ناقصة: المستخدم غير مسجل الدخول",
          )[lang],
        );
      }

      const profile = await fetchStudentProfile(user.id);
      if (!isStudentProfileComplete(profile)) {
        throw new Error(certificateProfileIncompleteText(lang));
      }

      const studentNames = resolveCertificateStudentNames(profile);

      certificateRecord = await getOrCreateQuizCertificate(activeSubmission);
      const built = buildCertificateDisplayData(
        activeSubmission,
        certificateRecord,
        studentNames,
        activeGradeName,
        activeLessonTitle,
      );
      const qrDataUrl = await buildCertificateQrDataUrl(built.certificateId);
      const withQr = { ...built, qrDataUrl };

      const missing = validateCertificateInputs(
        activeSubmission,
        activeGradeName,
        activeLessonTitle,
        withQr,
      );
      if (missing.length > 0) {
        throw new Error(missingRequiredFieldsText(lang, missing));
      }

      setDisplayData(withQr);
    } catch (error) {
      console.error("[certificate prepare]", error);
      const message = parentView
        ? parentCertificateLoadErrorText(lang)
        : error instanceof Error
          ? error.message
          : L("Certificate could not be loaded", "تعذر تحميل الشهادة")[lang];
      setLoadError(message);
      setDisplayData(null);
    } finally {
      setLoading(false);
    }
  }, [submission, gradeName, lessonTitle, lang, parentView]);

  useEffect(() => {
    if (open) {
      void prepareCertificate();
    } else {
      setDisplayData(null);
      setLoadError(null);
      setPdfError(null);
      setPdfBlob(null);
      setPdfUrl(null);
    }
  }, [open, prepareCertificate]);

  // Build the PDF once data is ready; the same Blob powers both the preview and the download.
  useEffect(() => {
    if (!open || !displayData) return;

    let cancelled = false;
    let objectUrl: string | null = null;
    setBuildingPdf(true);
    setPdfError(null);

    void (async () => {
      try {
        const el = pdfRef.current;
        if (!el) {
          throw new Error(`PDF source element not found (#${CERTIFICATE_EXPORT_ID})`);
        }
        const blob = await renderCertificatePdfBlob(el);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfBlob(blob);
        setPdfUrl(objectUrl);
      } catch (error) {
        if (cancelled) return;
        console.error("[certificate pdf preview]", error);
        setPdfError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) setBuildingPdf(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, displayData]);

  const handleDownloadPdf = async () => {
    if (!displayData) {
      setPdfError(`PDF source element not found (#${CERTIFICATE_EXPORT_ID})`);
      return;
    }

    setDownloading(true);
    setPdfError(null);
    try {
      const filename = safeCertificateFilename(displayData.studentName);
      let blob = pdfBlob;
      if (!blob) {
        const el = pdfRef.current;
        if (!el) {
          throw new Error(`PDF source element not found (#${CERTIFICATE_EXPORT_ID})`);
        }
        blob = await renderCertificatePdfBlob(el);
        setPdfBlob(blob);
      }
      triggerCertificatePdfDownload(blob, filename);
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
    ? validateCertificateInputs(
        submission ?? ({} as SavedQuizSubmission),
        gradeName ?? { en: "", ar: "" },
        lessonTitle ?? { en: "", ar: "" },
        displayData,
      )
    : validateCertificateInputs(
        submission ?? ({} as SavedQuizSubmission),
        gradeName ?? { en: "", ar: "" },
        lessonTitle ?? { en: "", ar: "" },
        null,
      );

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
            "data-[state=open]:!animate-none data-[state=closed]:!animate-none",
          ].join(" ")}
        >
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Award className="h-5 w-5 text-primary shrink-0" />
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
              <div className="font-semibold">{loadError}</div>
              {loadError === certificateProfileIncompleteText(lang) && !parentView && (
                <Link
                  to="/student/profile"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
                >
                  {L("Complete profile", "إكمال الملف الشخصي")[lang]}
                </Link>
              )}
              {missingFields.length > 0 &&
                loadError !== certificateProfileIncompleteText(lang) &&
                !parentView && (
                <div className="text-xs font-mono break-all">
                  {L("Missing fields", "الحقول الناقصة")[lang]}: {missingFields.join(", ")}
                </div>
              )}
            </div>
          ) : displayData ? (
            <>
              <div className="flex-1 min-h-[220px] overflow-y-auto overflow-x-hidden w-full max-w-full">
                <div className="flex flex-col gap-4 w-full max-w-full">
                  {buildingPdf || !pdfUrl ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {L("Preparing certificate…", "جارٍ تجهيز الشهادة…")[lang]}
                    </div>
                  ) : (
                    <object
                      data={pdfUrl}
                      type="application/pdf"
                      aria-label={L("Certificate preview", "معاينة الشهادة")[lang]}
                      className="w-full h-[320px] sm:h-[420px] rounded-lg border border-border bg-muted/30"
                    >
                      <iframe
                        src={pdfUrl}
                        title={L("Certificate preview", "معاينة الشهادة")[lang]}
                        className="w-full h-[320px] sm:h-[420px] rounded-lg border-0"
                      />
                    </object>
                  )}

                  {downloading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {L("Generating PDF...", "جارٍ إنشاء PDF...")[lang]}
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
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50 w-full"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloading
                    ? L("Generating PDF...", "جارٍ إنشاء PDF...")[lang]
                    : L("Download PDF", "تحميل PDF")[lang]}
                </button>
                <button
                  type="button"
                  disabled={downloading}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary transition-colors w-full disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  {L("Close", "إغلاق")[lang]}
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
  lang: Lang;
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
        toast.error(certificateProfileIncompleteText(lang), {
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
        className="inline-flex items-center gap-2 rounded-full border-2 border-primary bg-primary/10 px-6 py-2.5 text-sm font-semibold text-primary hover:bg-primary-hover hover:text-white transition-colors disabled:opacity-60"
      >
        {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
        {checking
          ? L("Checking profile…", "جارٍ التحقق…")[lang]
          : L("Download Certificate", "تحميل الشهادة")[lang]}
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
