import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";
import { useStudentShell } from "@/lib/student-shell-context";

export function StudentDashboardHero() {
  const { tr, trf, lang } = useI18n();
  const { displayName, gradeSlug, hasGrade, section, islamicGroup } = useStudentShell();

  const gradeLabel = hasGrade ? gradeDisplayName(gradeSlug, lang) : tr("not_set");
  const sectionText = sectionLabel(section, lang);
  const groupText = islamicGroupLabel(islamicGroup, lang);

  const identityChips = [
    { key: "grade", label: gradeLabel },
    { key: "section", label: sectionText },
    { key: "group", label: groupText },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand-dark/30 bg-brand-dark text-white shadow-[var(--shadow-soft)]">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-dark to-primary/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-8 end-0 h-28 w-28 rounded-full bg-primary/15 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 start-0 h-20 w-32 rounded-full bg-primary/10 blur-2xl"
        aria-hidden
      />

      <div className="relative flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold leading-tight text-white sm:text-2xl">
            {trf("student_dash_welcome", { name: displayName })}
          </h1>
          <p className="mt-1 text-sm text-white/75 sm:text-base">{tr("student_dash_welcome_lead")}</p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2 sm:max-w-[48%] sm:justify-end">
          {identityChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex max-w-full items-center rounded-full border border-primary/35 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm"
            >
              <span className="truncate">{chip.label}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
