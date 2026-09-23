import { useMemo } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { brandLogoTransparentUrl } from "@/lib/brand";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { gradeSlugToStageKey } from "@/lib/teacher-homepage";
import type { TeacherContext } from "@/lib/teacher-dashboard";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";
import type { StageCardKey } from "@/lib/stage-images";

const MAX_CHIPS = 3;

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
    <section className="relative overflow-hidden rounded-2xl bg-brand-dark text-white shadow-[var(--shadow-soft)]">
      <div className="relative border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <BrandLogo src={brandLogoTransparentUrl()} alt={tr("school_logo_alt")} size="headerCompact" />
          <h2 className="min-w-0 font-display text-sm font-semibold text-[#FF7A00] sm:text-base md:text-lg">
            {tr("teacher_title")}
          </h2>
        </div>
      </div>

      <div className="relative p-4 sm:p-5">
        <h1 className="font-display text-xl font-semibold leading-tight text-white sm:text-2xl">
          {tr("teacher_home_welcome")}
        </h1>
        <p className="mt-1 text-sm text-[#E7E2DC]">{trf("teacher_welcome_name", { name: context.fullName })}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-[#E7E2DC] sm:text-sm">{tr("teacher_dash_hero_lead")}</p>

        <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
          {chipGroups.map((group) => (
            <div key={group.label} className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E7E2DC]">
                {group.label}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {group.values.map((value) => (
                  <span
                    key={`${group.label}-${value}`}
                    className="inline-flex max-w-full items-center rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white"
                  >
                    <span className="truncate">{value}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
