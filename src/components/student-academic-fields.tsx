import { useI18n } from "@/lib/i18n";
import {
  ISLAMIC_GROUPS,
  STUDENT_SECTIONS,
  type IslamicGroup,
  type StudentSection,
  islamicGroupLabel,
  sectionLabel,
} from "@/lib/student-academics";

const selectClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm";

type Props = {
  section: StudentSection | "";
  islamicGroup: IslamicGroup | "";
  onSectionChange: (value: StudentSection) => void;
  onIslamicGroupChange: (value: IslamicGroup) => void;
  required?: boolean;
  sectionName?: string;
  islamicGroupName?: string;
};

export function StudentAcademicFields({
  section,
  islamicGroup,
  onSectionChange,
  onIslamicGroupChange,
  required = false,
  sectionName = "section",
  islamicGroupName = "islamic_group",
}: Props) {
  const { tr, lang } = useI18n();

  return (
    <>
      <div>
        <label className="text-xs font-medium text-muted-foreground">{tr("auth_section")}</label>
        <select
          name={sectionName}
          required={required}
          value={section}
          onChange={(e) => onSectionChange(e.target.value as StudentSection)}
          className={selectClass}
        >
          <option value="">{tr("select_placeholder")}</option>
          {STUDENT_SECTIONS.map((value) => (
            <option key={value} value={value}>
              {sectionLabel(value, lang)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">{tr("auth_islamic_group")}</label>
        <select
          name={islamicGroupName}
          required={required}
          value={islamicGroup}
          onChange={(e) => onIslamicGroupChange(e.target.value as IslamicGroup)}
          className={selectClass}
        >
          <option value="">{tr("select_placeholder")}</option>
          {ISLAMIC_GROUPS.map((value) => (
            <option key={value} value={value}>
              {islamicGroupLabel(value, lang)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
