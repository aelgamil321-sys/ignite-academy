import { useState } from "react";
import { Award, Eye, Sparkles } from "lucide-react";
import { CertificateModal } from "@/components/certificate-modal";
import { useI18n, uiBi } from "@/lib/i18n";
import { localeForFormatting, type Lang } from "@/lib/i18n-config";
import { PARENT_NAV_ANCHORS } from "@/lib/parent-nav";
import {
  PARENT_DASH_EMPTY,
  PARENT_DASH_SECTION,
  PARENT_DASH_SECTION_LEAD,
  PARENT_DASH_SECTION_TITLE,
} from "@/lib/parent-dashboard-ui";
import { computeStudentBadges } from "@/lib/student-badges";
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

export function ParentDashboardAchievements({
  progress,
  studentUserId,
}: {
  progress: StudentProgressData;
  studentUserId: string;
}) {
  const { lang, tr } = useI18n();
  const [viewing, setViewing] = useState<(typeof progress.certificates)[0] | null>(null);
  const certificates = progress.certificates.slice(0, 4);
  const { badges } = computeStudentBadges(progress);
  const unlockedBadges = badges.filter((b) => b.unlocked);

  return (
    <section id={PARENT_NAV_ANCHORS.achievements} className={`scroll-mt-24 ${PARENT_DASH_SECTION}`}>
      <div className="mb-3">
        <h2 className={PARENT_DASH_SECTION_TITLE}>{tr("parent_achievements_section_title")}</h2>
        <p className={PARENT_DASH_SECTION_LEAD}>{tr("parent_achievements_section_lead")}</p>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold text-foreground">{tr("parent_latest_certificates")}</h3>
          </div>
          {certificates.length === 0 ? (
            <div className={PARENT_DASH_EMPTY}>
              <Award className="h-3.5 w-3.5 shrink-0 text-foreground/45" aria-hidden />
              <span>{tr("parent_kpi_no_certs_yet")}</span>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {certificates.map((certificate) => {
                const title = uiBi(certificate.lessonTitle, lang) || certificate.lessonTitle.en;
                return (
                  <article
                    key={certificate.certificateId}
                    className="flex flex-col rounded-md border border-border/80 bg-background p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
                        {title}
                      </h4>
                      <span className="shrink-0 font-display text-base font-semibold text-primary">
                        {certificate.percentage}%
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-foreground/55">
                      {formatDate(certificate.issuedAt, lang)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setViewing(certificate)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/6 px-2 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    >
                      <Eye className="h-3 w-3" />
                      {tr("parent_view_certificate")}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border/80 pt-3">
          <div className="mb-1.5 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold text-foreground">{tr("parent_achievements_badges")}</h3>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
            {badges.map((badge) => (
              <article
                key={badge.id}
                className={`rounded-md border p-2 text-center ${
                  badge.unlocked
                    ? "border-primary/30 bg-primary/6 shadow-sm"
                    : "border-border/70 bg-muted/25"
                }`}
              >
                <div
                  className={`text-lg leading-none ${badge.unlocked ? "" : "opacity-45 grayscale"}`}
                  aria-hidden
                >
                  {badge.icon}
                </div>
                <p
                  className={`mt-1 text-[10px] font-medium leading-tight line-clamp-2 ${
                    badge.unlocked ? "text-foreground" : "text-foreground/50"
                  }`}
                >
                  {uiBi(badge.title, lang)}
                </p>
              </article>
            ))}
          </div>
          {unlockedBadges.length === 0 ? (
            <p className={`mt-1.5 ${PARENT_DASH_EMPTY}`}>
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-foreground/45" aria-hidden />
              <span>{tr("parent_badges_empty")}</span>
            </p>
          ) : null}
        </div>
      </div>

      {viewing ? (
        <CertificateModal
          open={!!viewing}
          onOpenChange={(open) => !open && setViewing(null)}
          lang={lang}
          parentView={{
            certificateId: viewing.certificateId,
            studentUserId,
          }}
        />
      ) : null}
    </section>
  );
}
