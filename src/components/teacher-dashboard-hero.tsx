import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import patternImg from "@/assets/pattern.jpg";
import { BrandLogo, DepartmentLogoCard } from "@/components/brand-logo";
import { certificateIslamicLogoUrl, certificateSchoolLogoUrl } from "@/lib/certificate-branding";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { gradeSlugToStageKey } from "@/lib/teacher-homepage";
import type { TeacherContext } from "@/lib/teacher-dashboard";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";
import type { StageCardKey } from "@/lib/stage-images";

const MAX_CHIPS = 4;

function stageLabelKey(stage: StageCardKey): "stage_kg" | "stage_elem" | "stage_mid" | "stage_high" {
  if (stage === "kg") return "stage_kg";
  if (stage === "elementary") return "stage_elem";
  if (stage === "middle") return "stage_mid";
  return "stage_high";
}

function summarize(values: string[], moreLabel: (count: number) => string): string[] {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length <= MAX_CHIPS) return unique;
  return [...unique.slice(0, MAX_CHIPS), moreLabel(unique.length - MAX_CHIPS)];
}

type TeacherDashboardHeroProps = {
  context: TeacherContext;
};

export function TeacherDashboardHero({ context }: TeacherDashboardHeroProps) {
  const { tr, trf, lang } = useI18n();

  const scopeChips = useMemo(() => {
    if (context.isLeadTeacher && context.assignments.length === 0) {
      return {
        stages: [tr("teacher_all_grades")],
        grades: [tr("teacher_all_grades")],
        sections: [tr("teacher_all_sections")],
        groups: [tr("teacher_all_groups")],
      };
    }

    if (context.assignments.length === 0) {
      return {
        stages: [tr("teacher_no_classes")],
        grades: [tr("teacher_no_classes")],
        sections: ["—"],
        groups: ["—"],
      };
    }

    const stages = summarize(
      context.assignments.map((a) => tr(stageLabelKey(gradeSlugToStageKey(a.grade)))),
      (n) => trf("teacher_dash_scope_more", { count: String(n) }),
    );

    const gradeNames = summarize(
      context.assignments.map((a) => gradeDisplayName(a.grade, lang)),
      (n) => trf("teacher_dash_scope_more", { count: String(n) }),
    );

    const sectionValues = context.assignments
      .map((a) => (a.section ? sectionLabel(a.section, lang) : null))
      .filter(Boolean) as string[];
    const sections =
      sectionValues.length === 0
        ? [tr("teacher_all_sections")]
        : summarize(sectionValues, (n) => trf("teacher_dash_scope_more", { count: String(n) }));

    const groupValues = context.assignments
      .map((a) => (a.islamic_group ? islamicGroupLabel(a.islamic_group, lang) : null))
      .filter(Boolean) as string[];
    const groups =
      groupValues.length === 0
        ? [tr("teacher_all_groups")]
        : summarize(groupValues, (n) => trf("teacher_dash_scope_more", { count: String(n) }));

    return { stages, grades: gradeNames, sections, groups };
  }, [context, lang, tr, trf]);

  const chipGroups: Array<{ label: string; values: string[] }> = [
    { label: tr("teacher_dash_scope_stage"), values: scopeChips.stages },
    { label: tr("teacher_assigned_grades"), values: scopeChips.grades },
    { label: tr("teacher_assigned_sections"), values: scopeChips.sections },
    { label: tr("teacher_assigned_groups"), values: scopeChips.groups },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl bg-brand-dark text-white shadow-[var(--shadow-elegant)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-luminosity"
        style={{ backgroundImage: `url(${patternImg})`, backgroundSize: "320px" }}
        aria-hidden
      />
      <div className="relative grid gap-8 p-5 sm:p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <BrandLogo
              src={certificateSchoolLogoUrl()}
              alt={tr("school_logo_alt")}
              size="headerCompact"
              className="rounded-lg bg-white/95 p-1"
            />
            <DepartmentLogoCard
              src={certificateIslamicLogoUrl()}
              alt={tr("teacher_dash_islamic_logo_alt")}
              className="max-w-[140px] rounded-xl p-2 sm:max-w-[160px]"
            />
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/50 bg-primary/15 px-3 py-1.5 text-xs font-medium tracking-wide text-primary sm:text-sm">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>{tr("teacher_title")}</span>
          </div>

          <h1 className="mt-4 font-display text-2xl font-semibold leading-tight text-[#F4B400] sm:text-3xl md:text-4xl">
            {tr("teacher_home_welcome")}
          </h1>
          <p className="mt-2 text-sm text-white/85 sm:text-base">{tr("teacher_dash_hero_lead")}</p>
          <p className="mt-1 text-sm text-white/70">{trf("teacher_welcome_name", { name: context.fullName })}</p>

          <div className="mt-6 space-y-3">
            {chipGroups.map((group) => (
              <div key={group.label} className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55 sm:text-xs">
                  {group.label}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {group.values.map((value) => (
                    <span
                      key={`${group.label}-${value}`}
                      className="inline-flex max-w-full items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-sm"
                    >
                      <span className="truncate">{value}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden min-w-0 lg:block lg:max-w-md xl:max-w-lg">
          <div className="overflow-hidden rounded-2xl border border-primary/25 shadow-[var(--shadow-elegant)]">
            <img src={heroImg} alt="" width={1600} height={1100} className="h-auto w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
