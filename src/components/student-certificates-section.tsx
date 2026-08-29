import { Link } from "@tanstack/react-router";
import { Award } from "lucide-react";
import { StudentDashboardSection } from "@/components/student-dashboard-section";
import { useI18n } from "@/lib/i18n";
import { localeForFormatting, type Lang } from "@/lib/i18n-config";
import type { StudentProgressData } from "@/lib/student-progress";

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

type StudentCertificatesSectionProps = {
  progress: StudentProgressData;
  gradeSlug: string;
};

export function StudentCertificatesSection({ progress, gradeSlug }: StudentCertificatesSectionProps) {
  const { tr, bi, lang } = useI18n();

  return (
    <StudentDashboardSection
      title={tr("student_dash_certificates")}
      icon={<Award className="h-4 w-4" aria-hidden />}
      className="h-full"
    >
      {progress.certificates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">{tr("student_dash_certificates_empty")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {progress.certificates.map((cert) => (
            <li
              key={cert.certificateId}
              className="flex min-w-0 flex-col gap-1 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 to-background px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to="/grades/$grade/$lesson"
                  params={{ grade: gradeSlug, lesson: cert.lessonId }}
                  className="line-clamp-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {bi(cert.lessonTitle) || cert.lessonTitle.en}
                </Link>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{cert.certificateId}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-end">
                <span className="font-display text-lg font-semibold text-primary">{cert.percentage}%</span>
                <span className="text-xs text-muted-foreground">{formatDate(cert.issuedAt, lang)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </StudentDashboardSection>
  );
}
