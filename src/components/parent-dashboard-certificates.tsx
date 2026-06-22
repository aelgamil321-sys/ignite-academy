import { useState } from "react";
import { Award, Eye } from "lucide-react";
import { CertificateModal } from "@/components/certificate-modal";
import { useI18n, uiBi } from "@/lib/i18n";
import { localeForFormatting, type Lang } from "@/lib/i18n-config";
import type { StudentCertificateRow } from "@/lib/student-progress";

function formatDate(iso: string, lang: Lang): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(localeForFormatting(lang), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ParentDashboardCertificates({
  certificates,
  studentUserId,
}: {
  certificates: StudentCertificateRow[];
  studentUserId: string;
}) {
  const { lang, tr } = useI18n();
  const [viewing, setViewing] = useState<StudentCertificateRow | null>(null);
  const latest = certificates.slice(0, 5);

  return (
    <section className="rounded-2xl border border-primary/15 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Award className="h-5 w-5" />
        </div>
        <h2 className="font-display text-xl text-foreground">
          {tr("parent_latest_certificates")}
        </h2>
      </div>

      {latest.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          {tr("parent_no_certificates")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {latest.map((certificate) => {
            const title = uiBi(certificate.lessonTitle, lang) || certificate.lessonTitle.en;
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
                  {tr("parent_view_certificate")}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {viewing && (
        <CertificateModal
          open={!!viewing}
          onOpenChange={(open) => !open && setViewing(null)}
          lang={lang}
          parentView={{
            certificateId: viewing.certificateId,
            studentUserId,
          }}
        />
      )}
    </section>
  );
}
