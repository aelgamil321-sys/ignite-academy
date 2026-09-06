import { grades } from "@/lib/curriculum";
import { useI18n } from "@/lib/i18n";
import {
  ANALYTICS_UNSET_KEY,
  type AnalyticsFilters,
} from "@/lib/admin-analytics";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  islamicGroupLabel,
  sectionLabel,
} from "@/lib/student-academics";
import {
  TEACHING_SUBJECT_TYPES,
  teachingSubjectLabel,
  type TeachingSubjectType,
} from "@/lib/teacher-assignment-subject";

const selectClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm";

export type KhdaFilterOption = { value: string; label: string };

export type KhdaAnalyticsFilterBarProps = {
  filters: AnalyticsFilters;
  onChange: (filters: AnalyticsFilters) => void;
  gradeOptions?: KhdaFilterOption[];
  sectionOptions?: KhdaFilterOption[];
  islamicGroupOptions?: KhdaFilterOption[];
  showTeachingSubject?: boolean;
  teachingSubjectOptions?: TeachingSubjectType[];
};

export function KhdaAnalyticsFilterBar({
  filters,
  onChange,
  gradeOptions,
  sectionOptions,
  islamicGroupOptions,
  showTeachingSubject = false,
  teachingSubjectOptions = [...TEACHING_SUBJECT_TYPES],
}: KhdaAnalyticsFilterBarProps) {
  const { lang, tr, bi } = useI18n();

  const gradesList =
    gradeOptions ??
    grades.map((grade) => ({
      value: grade.slug,
      label: bi(grade.name),
    }));

  const sectionsList =
    sectionOptions ??
    STUDENT_SECTIONS.map((section) => ({
      value: section,
      label: sectionLabel(section, lang),
    }));

  const groupsList =
    islamicGroupOptions ??
    ISLAMIC_GROUPS.map((group) => ({
      value: group,
      label: islamicGroupLabel(group, lang),
    }));

  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-sm font-semibold tracking-tight text-foreground">
        {tr("khda_filters_title")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">{tr("khda_filter_grade")}</label>
          <select
            value={filters.grade}
            onChange={(e) => onChange({ ...filters, grade: e.target.value })}
            className={selectClass}
          >
            <option value="">{tr("khda_filter_all")}</option>
            {gradesList.map((grade) => (
              <option key={grade.value} value={grade.value}>
                {grade.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {tr("khda_filter_section")}
          </label>
          <select
            value={filters.section}
            onChange={(e) => onChange({ ...filters, section: e.target.value })}
            className={selectClass}
          >
            <option value="">{tr("khda_filter_all")}</option>
            <option value={ANALYTICS_UNSET_KEY}>{tr("khda_filter_not_set")}</option>
            {sectionsList.map((section) => (
              <option key={section.value} value={section.value}>
                {section.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {tr("khda_filter_islamic_group")}
          </label>
          <select
            value={filters.islamicGroup}
            onChange={(e) => onChange({ ...filters, islamicGroup: e.target.value })}
            className={selectClass}
          >
            <option value="">{tr("khda_filter_all")}</option>
            <option value={ANALYTICS_UNSET_KEY}>{tr("khda_filter_not_set")}</option>
            {groupsList.map((group) => (
              <option key={group.value} value={group.value}>
                {group.label}
              </option>
            ))}
          </select>
        </div>
        {showTeachingSubject ? (
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {tr("khda_filter_teaching_subject")}
            </label>
            <select
              value={filters.teachingSubject ?? ""}
              onChange={(e) =>
                onChange({ ...filters, teachingSubject: e.target.value || undefined })
              }
              className={selectClass}
            >
              <option value="">{tr("khda_filter_all")}</option>
              {teachingSubjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {teachingSubjectLabel(subject, lang)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </section>
  );
}
