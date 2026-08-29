import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { ParentChildSelector } from "@/components/parent-child-selector";
import { useI18n, L } from "@/lib/i18n";
import type { ParentDashboardData } from "@/lib/parent-dashboard";
import type { ParentLinkedChild } from "@/lib/parent-children";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";

function ProgressRing({ value, label }: { value: number; label: string }) {
  const size = 68;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center">
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-base leading-none text-primary">{value}%</span>
        <span className="mt-0.5 text-[8px] uppercase tracking-wider text-white/55">{label}</span>
      </div>
    </div>
  );
}

type ParentDashboardHeroProps = {
  data: ParentDashboardData;
  linkedChildren?: ParentLinkedChild[];
  selectedStudentUserId?: string;
  onSelectChild?: (studentUserId: string) => void;
};

export function ParentDashboardHero({
  data,
  linkedChildren,
  selectedStudentUserId,
  onSelectChild,
}: ParentDashboardHeroProps) {
  const { tr, lang } = useI18n();
  const { performanceReport: report, progress } = data;
  const showChildSelector =
    linkedChildren &&
    selectedStudentUserId &&
    onSelectChild &&
    linkedChildren.length > 1;

  return (
    <section className="parent-dash-enter relative overflow-hidden rounded-xl border border-primary/25 bg-brand-dark text-white shadow-[var(--shadow-soft)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, var(--primary) 0%, transparent 40%)",
        }}
        aria-hidden
      />

      <div className="relative p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <StudentProfileAvatar
              profilePhotoPath={report.profilePhotoPath}
              alt={report.arabicName}
              className="h-14 w-14 shrink-0 ring-2 ring-primary/35 sm:h-16 sm:w-16"
              fallbackClassName="bg-primary/15 text-primary text-sm"
            />

            <div className="min-w-0 flex-1">
              <div className="font-display text-lg leading-tight text-white sm:text-xl" dir="rtl">
                {report.arabicName}
              </div>
              <div className="text-sm font-medium text-white/75">{report.englishName}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-white/20 bg-white/8 px-2.5 py-0.5 text-[11px] font-semibold text-white/90">
                  {L(report.gradeLabelEn, report.gradeLabelAr)[lang]}
                </span>
                <span className="rounded-full border border-white/20 bg-white/8 px-2.5 py-0.5 text-[11px] font-semibold text-white/90">
                  {sectionLabel(report.section, lang)}
                </span>
                <span className="rounded-full border border-white/20 bg-white/8 px-2.5 py-0.5 text-[11px] font-semibold text-white/90">
                  {islamicGroupLabel(report.islamicGroup, lang)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 justify-end sm:justify-center">
            <ProgressRing value={progress.overallProgressPct} label={tr("parent_progress_label")} />
          </div>
        </div>

        {showChildSelector ? (
          <div className="mt-3 border-t border-white/10 pt-3">
            <ParentChildSelector
              variant="compact"
              linkedChildren={linkedChildren}
              selectedStudentUserId={selectedStudentUserId}
              onSelect={onSelectChild}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
