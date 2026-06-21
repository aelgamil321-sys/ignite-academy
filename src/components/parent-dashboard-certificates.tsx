import { useState } from "react";
import { Award, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n, L } from "@/lib/i18n";
import type { StudentCertificateRow } from "@/lib/student-progress";

function formatDate(iso: string, lang: "en" | "ar"): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function CertificateViewDialog({
  certificate,
  open,
  onOpenChange,
  lang,
  title,
}: {
  certificate: StudentCertificateRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: "en" | "ar";
  title: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {L("Certificate Details", "تفاصيل الشهادة")[lang]}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {L("Lesson", "الدرس")[lang]}
            </div>
            <div className="mt-1 font-display text-lg text-foreground">{title}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
              <div className="text-xs text-muted-foreground">{L("Date", "التاريخ")[lang]}</div>
              <div className="mt-0.5 text-sm font-semibold">
                {formatDate(certificate.issuedAt, lang)}
              </div>
            </div>
            <div className="rounded-xl border border-primary/25 bg-primary/8 px-3 py-2.5">
              <div className="text-xs text-muted-foreground">{L("Score", "الدرجة")[lang]}</div>
              <div className="mt-0.5 font-display text-xl text-primary">
                {certificate.percentage}%
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-border bg-background px-3 py-2.5">
            <div className="text-xs text-muted-foreground">{L("Certificate ID", "رقم الشهادة")[lang]}</div>
            <div className="mt-0.5 font-mono text-sm text-foreground">{certificate.certificateId}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ParentDashboardCertificates({
  certificates,
}: {
  certificates: StudentCertificateRow[];
}) {
  const { lang, bi } = useI18n();
  const [viewing, setViewing] = useState<StudentCertificateRow | null>(null);
  const latest = certificates.slice(0, 5);

  return (
    <section className="rounded-2xl border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Award className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl text-foreground">
          {L("Latest Certificates", "أحدث الشهادات")[lang]}
        </h2>
      </div>

      {latest.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          {L(
            "No certificates yet. Completed lesson quizzes will appear here.",
            "لا توجد شهادات بعد. ستظهر هنا عند إتمام اختبارات الدروس.",
          )[lang]}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {latest.map((certificate) => {
            const title = bi(certificate.lessonTitle) || certificate.lessonTitle.en;
            return (
              <article
                key={certificate.certificateId}
                className="group flex flex-col rounded-2xl border border-border bg-background p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-gold)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 font-display text-base leading-snug text-foreground">
                    {title}
                  </h3>
                  <span className="shrink-0 font-display text-xl text-primary">
                    {certificate.percentage}%
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {formatDate(certificate.issuedAt, lang)}
                </p>
                <button
                  type="button"
                  onClick={() => setViewing(certificate)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/8 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {L("View certificate", "عرض الشهادة")[lang]}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {viewing && (
        <CertificateViewDialog
          certificate={viewing}
          open={!!viewing}
          onOpenChange={(open) => !open && setViewing(null)}
          lang={lang}
          title={bi(viewing.lessonTitle) || viewing.lessonTitle.en}
        />
      )}
    </section>
  );
}
