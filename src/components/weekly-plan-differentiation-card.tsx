import { useI18n } from "@/lib/i18n";
import type { ScopedStudentRow } from "@/lib/teacher-dashboard";
import type { WeeklyPlanDifferentiationCategory } from "@/lib/weekly-planning";

const fieldClass = "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm";

export function WeeklyPlanDifferentiationCard({
  title,
  category,
  students,
  onChange,
  studentLabel,
}: {
  title: string;
  category: WeeklyPlanDifferentiationCategory;
  students: ScopedStudentRow[];
  onChange: (category: WeeklyPlanDifferentiationCategory) => void;
  studentLabel?: (student: ScopedStudentRow) => string;
}) {
  const { tr } = useI18n();
  const labelFor = studentLabel ?? ((s: ScopedStudentRow) => s.displayName);

  const toggleStudent = (student: ScopedStudentRow) => {
    const ids = category.student_ids ?? [];
    const names = category.student_names_snapshot ?? [];
    const snapshotName = labelFor(student);
    const exists = ids.includes(student.userId);
    if (exists) {
      const idx = ids.indexOf(student.userId);
      onChange({
        ...category,
        student_ids: ids.filter((id) => id !== student.userId),
        student_names_snapshot: names.filter((_, i) => i !== idx),
      });
    } else {
      onChange({
        ...category,
        student_ids: [...ids, student.userId],
        student_names_snapshot: [...names, snapshotName],
      });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h4 className="font-semibold text-foreground">{title}</h4>
      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("wp_no_students_scope")}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {students.map((s) => {
            const selected = (category.student_ids ?? []).includes(s.userId);
            return (
              <button
                key={s.userId}
                type="button"
                onClick={() => toggleStudent(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/40 text-foreground hover:bg-muted"
                }`}
              >
                {labelFor(s)}
              </button>
            );
          })}
        </div>
      )}
      <label className="block text-sm">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {tr("wp_diff_notes")}
        </span>
        <textarea
          className={fieldClass}
          rows={4}
          placeholder={tr("wp_diff_notes_placeholder")}
          value={category.notes ?? ""}
          onChange={(e) => onChange({ ...category, notes: e.target.value })}
        />
      </label>
    </div>
  );
}
