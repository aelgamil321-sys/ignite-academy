import { useMemo } from "react";
import { BadgeCheck, Loader2, Mail, UserRound } from "lucide-react";
import { StudentProfileAvatar } from "@/components/student-profile-avatar";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { useTeacherShell } from "@/lib/teacher-shell-context";
import { gradeSlugToStageKey } from "@/lib/teacher-homepage";
import { formatClassScopeLabel } from "@/lib/teacher-dashboard";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";
import type { StageCardKey } from "@/lib/stage-images";

function stageLabelKey(stage: StageCardKey): "stage_kg" | "stage_elem" | "stage_mid" | "stage_high" {
  if (stage === "kg") return "stage_kg";
  if (stage === "elementary") return "stage_elem";
  if (stage === "middle") return "stage_mid";
  return "stage_high";
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function TeacherProfilePage() {
  const { tr, trf, lang } = useI18n();
  const { context, teacherName, email, profilePhotoPath } = useTeacherShell();

  const scope = useMemo(() => {
    if (!context) return null;

    if (context.isLeadTeacher && context.assignments.length === 0) {
      return {
        stages: [tr("teacher_all_grades")],
        grades: [tr("teacher_all_grades")],
        sections: [tr("teacher_all_sections")],
        groups: [tr("teacher_all_groups")],
        classLabels: [] as string[],
        classCount: context.assignedGrades.length,
      };
    }

    if (context.assignments.length === 0) {
      return {
        stages: [tr("teacher_no_classes")],
        grades: [tr("teacher_no_classes")],
        sections: ["—"],
        groups: ["—"],
        classLabels: [] as string[],
        classCount: 0,
      };
    }

    const stages = uniqueValues(
      context.assignments.map((a) => tr(stageLabelKey(gradeSlugToStageKey(a.grade)))),
    );
    const gradeNames = uniqueValues(
      context.assignments.map((a) => gradeDisplayName(a.grade, lang)),
    );
    const sectionValues = uniqueValues(
      context.assignments
        .map((a) => (a.section ? sectionLabel(a.section, lang) : null))
        .filter(Boolean) as string[],
    );
    const groupValues = uniqueValues(
      context.assignments
        .map((a) => (a.islamic_group ? islamicGroupLabel(a.islamic_group, lang) : null))
        .filter(Boolean) as string[],
    );

    const classLabels = context.assignments.map((a) => formatClassScopeLabel(a, lang));

    return {
      stages,
      grades: gradeNames,
      sections: sectionValues.length > 0 ? sectionValues : [tr("teacher_all_sections")],
      groups: groupValues.length > 0 ? groupValues : [tr("teacher_all_groups")],
      classLabels,
      classCount: context.assignments.length,
    };
  }, [context, lang, tr]);

  if (!context || !scope) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  const infoRows = [
    { label: tr("teacher_dash_scope_stage"), values: scope.stages },
    { label: tr("teacher_assigned_grades"), values: scope.grades },
    { label: tr("teacher_assigned_sections"), values: scope.sections },
    { label: tr("teacher_assigned_groups"), values: scope.groups },
  ];

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <StudentProfileAvatar
            profilePhotoPath={profilePhotoPath}
            alt={teacherName}
            className="h-20 w-20 rounded-2xl"
            fallbackClassName="rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold text-foreground">{teacherName}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{email}</span>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground">
                <UserRound className="h-3.5 w-3.5 text-primary" />
                {tr("teacher_profile_role")}
              </span>
              {context.isLeadTeacher ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {tr("admin_teachers_lead_teacher")}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="font-display text-lg text-foreground">{tr("teacher_profile_teaching_info")}</h2>
        <dl className="mt-4 space-y-4">
          {infoRows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</dt>
              <dd className="mt-1.5 flex flex-wrap gap-2">
                {row.values.map((value) => (
                  <span
                    key={`${row.label}-${value}`}
                    className="inline-flex rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground"
                  >
                    {value}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="font-display text-lg text-foreground">{tr("teacher_home_scope_summary")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {trf("teacher_profile_class_count", { count: String(scope.classCount) })}
        </p>
        {scope.classLabels.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {scope.classLabels.map((label) => (
              <li
                key={label}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground"
              >
                {label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{tr("teacher_no_classes")}</p>
        )}
      </section>
    </div>
  );
}
