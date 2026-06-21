import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { useI18n, L } from "@/lib/i18n";
import { heroStatusLabel } from "@/lib/parent-dashboard-insights";
import type { ParentDashboardData } from "@/lib/parent-dashboard";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";

function ProgressRing({ value, label }: { value: number; label: string }) {
  const size = 88;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center">
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
        <span className="font-display text-lg leading-none text-primary">{value}%</span>
        <span className="mt-0.5 text-[9px] uppercase tracking-wider text-white/55">{label}</span>
      </div>
    </div>
  );
}

function statusBadgeClass(status: ParentDashboardData["performanceReport"]["status"]): string {
  if (status === "excellent") return "bg-primary/20 text-primary border-primary/40";
  if (status === "good") return "bg-primary/12 text-primary border-primary/30";
  if (status === "needs_support") return "bg-white/10 text-white/90 border-white/20";
  return "bg-white/5 text-white/60 border-white/15";
}

export function ParentDashboardHero({ data }: { data: ParentDashboardData }) {
  const { tr, lang } = useI18n();
  const { performanceReport: report, progress } = data;
  const status = heroStatusLabel(report.status, tr);

  return (
    <section className="parent-dash-enter relative overflow-hidden rounded-2xl border border-primary/20 bg-brand-dark text-white shadow-[var(--shadow-gold)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 8% 12%, var(--primary) 0%, transparent 36%), radial-gradient(circle at 92% 88%, var(--primary) 0%, transparent 32%)",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5 lg:flex-1">
          <StudentProfileAvatar
            profilePhotoPath={report.profilePhotoPath}
            alt={report.arabicName}
            className="h-20 w-20 ring-2 ring-primary/40 shadow-[0_0_24px_rgba(242,178,27,0.25)]"
            fallbackClassName="bg-primary/15 text-primary"
          />

          <div className="min-w-0 flex-1 text-center sm:text-start">
            <div className="inline-flex items-center gap-2 text-primary">
              <span className="text-lg" aria-hidden>
                👨‍👩‍👧
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.22em]">
                {tr("parent_dashboard_title")}
              </span>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-white/75 sm:text-base">
              {tr("parent_hero_instant_lead")}
            </p>

            <div className="mt-3">
              <div className="font-display text-2xl leading-tight text-white" dir="rtl">
                {report.arabicName}
              </div>
              <div className="mt-0.5 text-sm font-medium text-white/80">{report.englishName}</div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold">
                {L(report.gradeLabelEn, report.gradeLabelAr)[lang]}
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold">
                {sectionLabel(report.section, lang)}
              </span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold">
                {islamicGroupLabel(report.islamicGroup, lang)}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(report.status)}`}
              >
                {status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <ProgressRing value={progress.overallProgressPct} label={tr("parent_progress_label")} />
        </div>
      </div>
    </section>
  );
}
