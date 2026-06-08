import { useCallback, useRef, useState } from "react";
import { Award, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import type { Bi } from "@/lib/curriculum";
import type { SavedQuizSubmission } from "@/lib/lesson-quiz";
import {
  buildCertificateDisplayData,
  getOrCreateQuizCertificate,
  type QuizCertificateDisplayData,
} from "@/lib/quiz-certificate";
import {
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
  QuizCertificateDocument,
} from "@/components/quiz-certificate-document";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const L = (en: string, ar: string) => ({ en, ar });

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
  const certRef = useRef<HTMLDivElement>(null);
  const [displayData, setDisplayData] = useState<QuizCertificateDisplayData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const prepareCertificate = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user?.id;
      if (!uid) throw new Error("Not signed in");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", uid)
        .maybeSingle();

      const studentName =
        profile?.full_name?.trim() ||
        profile?.email?.trim() ||
        sessionData.session?.user?.email ||
        (lang === "ar" ? "طالب" : "Student");

      const certificate = await getOrCreateQuizCertificate(submission);
      setDisplayData(
        buildCertificateDisplayData(
          submission,
          certificate,
          studentName,
          gradeName,
          lessonTitle,
        ),
      );
    } catch (error) {
      console.error("[certificate prepare]", error);
      toast.error(
        error instanceof Error ? error.message : L("Could not load certificate", "تعذر تحميل الشهادة")[lang],
      );
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [submission, gradeName, lessonTitle, lang, onOpenChange]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next && !displayData) {
      void prepareCertificate();
    }
  };

  const handleDownloadPdf = async () => {
    const el = certRef.current;
    if (!el || !displayData) return;

    setDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fffef8",
        width: CERTIFICATE_WIDTH_PX,
        height: CERTIFICATE_HEIGHT_PX,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      pdf.addImage(imgData, "PNG", 0, 0, 297, 210);
      pdf.save(`certificate-${displayData.certificateId}.pdf`);
      toast.success(L("Certificate downloaded", "تم تحميل الشهادة")[lang]);
    } catch (error) {
      console.error("[certificate pdf]", error);
      toast.error(L("PDF download failed", "فشل تحميل PDF")[lang]);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald" />
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
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {L("Preparing certificate…", "جارٍ تجهيز الشهادة…")[lang]}
          </div>
        ) : displayData ? (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-2">
              <div
                style={{
                  transform: "scale(0.55)",
                  transformOrigin: "top left",
                  width: CERTIFICATE_WIDTH_PX * 0.55,
                  height: CERTIFICATE_HEIGHT_PX * 0.55,
                }}
              >
                <QuizCertificateDocument data={displayData} />
              </div>
            </div>

            <div
              aria-hidden
              style={{
                position: "fixed",
                left: -9999,
                top: 0,
                pointerEvents: "none",
              }}
            >
              <QuizCertificateDocument ref={certRef} data={displayData} />
            </div>

            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-emerald transition-colors disabled:opacity-50 w-full justify-center sm:w-auto"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {L("Download PDF", "تحميل PDF")[lang]}
            </button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
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
