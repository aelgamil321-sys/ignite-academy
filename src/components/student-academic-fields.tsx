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
  lang: "en" | "ar";
  section: StudentSection | "";
  islamicGroup: IslamicGroup | "";
  onSectionChange: (value: StudentSection) => void;
  onIslamicGroupChange: (value: IslamicGroup) => void;
  required?: boolean;
  sectionName?: string;
  islamicGroupName?: string;
};

export function StudentAcademicFields({
  lang,
  section,
  islamicGroup,
  onSectionChange,
  onIslamicGroupChange,
  required = false,
  sectionName = "section",
  islamicGroupName = "islamic_group",
}: Props) {
  const T = {
    section: lang === "ar" ? "الشعبة" : "Section",
    islamicGroup: lang === "ar" ? "المجموعة الإسلامية" : "Islamic Group",
    choose: lang === "ar" ? "اختر…" : "Select…",
  };

  return (
    <>
      <div>
        <label className="text-xs font-medium text-muted-foreground">{T.section}</label>
        <select
          name={sectionName}
          required={required}
          value={section}
          onChange={(e) => onSectionChange(e.target.value as StudentSection)}
          className={selectClass}
        >
          <option value="">{T.choose}</option>
          {STUDENT_SECTIONS.map((value) => (
            <option key={value} value={value}>
              {sectionLabel(value, lang)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">{T.islamicGroup}</label>
        <select
          name={islamicGroupName}
          required={required}
          value={islamicGroup}
          onChange={(e) => onIslamicGroupChange(e.target.value as IslamicGroup)}
          className={selectClass}
        >
          <option value="">{T.choose}</option>
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
