import { useI18n } from "@/lib/i18n";
import { sectionLabel, type StudentSection } from "@/lib/student-academics";

export function WeeklyPlanSectionMultiSelect({
  sections,
  availableSections,
  onChange,
}: {
  sections: StudentSection[];
  availableSections: StudentSection[];
  onChange: (sections: StudentSection[]) => void;
}) {
  const { lang, tr } = useI18n();

  const allSelected =
    availableSections.length > 0 && availableSections.every((s) => sections.includes(s));

  const toggleSection = (section: StudentSection) => {
    if (sections.includes(section)) {
      onChange(sections.filter((s) => s !== section));
    } else {
      onChange([...sections, section]);
    }
  };

  const selectAll = () => {
    onChange([...availableSections]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {tr("wp_field_sections")}
        </span>
        {availableSections.length > 0 ? (
          <button
            type="button"
            onClick={selectAll}
            disabled={allSelected}
            className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {tr("wp_select_all_sections")}
          </button>
        ) : null}
      </div>
      {availableSections.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("wp_select_placeholder")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {availableSections.map((section) => {
            const selected = sections.includes(section);
            return (
              <label
                key={section}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-muted/30 text-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={selected}
                  onChange={() => toggleSection(section)}
                />
                <span>{sectionLabel(section, lang)}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
