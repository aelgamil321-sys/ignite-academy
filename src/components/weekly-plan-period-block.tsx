import { useI18n } from "@/lib/i18n";
import type { WeeklyPlanMasterListItem, WeeklyPlanPeriod } from "@/lib/weekly-planning";
import { masterListItemLabel, masterListItemValue } from "@/lib/weekly-planning";

const fieldClass = "mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm";

export function WeeklyPlanPeriodBlock({
  title,
  period,
  sirMethods,
  onChange,
}: {
  title: string;
  period: WeeklyPlanPeriod;
  sirMethods: WeeklyPlanMasterListItem[];
  onChange: (period: WeeklyPlanPeriod) => void;
}) {
  const { lang, tr } = useI18n();

  const set = (key: keyof WeeklyPlanPeriod, value: string) => {
    onChange({ ...period, [key]: value });
  };

  const setYouDo = (group: "developing" | "securing" | "mastering" | "extension", value: string) => {
    onChange({
      ...period,
      you_do: { ...period.you_do, [group]: value },
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="font-display text-lg text-foreground">{title}</h4>

      <label className="block text-sm">
        <span className="font-semibold text-foreground">
          {tr("wp_period_do_now")} — {period.do_now_minutes ?? 5} {tr("wp_minutes")}
        </span>
        <textarea
          className={fieldClass}
          rows={3}
          value={period.do_now ?? ""}
          onChange={(e) => set("do_now", e.target.value)}
        />
      </label>

      <label className="block text-sm">
        <span className="font-semibold text-foreground">
          {tr("wp_period_objective")} — {period.learning_objective_minutes ?? 2} {tr("wp_minutes")}
        </span>
        <textarea
          className={fieldClass}
          rows={2}
          value={period.learning_objective_success_criteria ?? ""}
          onChange={(e) => set("learning_objective_success_criteria", e.target.value)}
        />
      </label>

      <label className="block text-sm">
        <span className="font-semibold text-foreground">
          {tr("wp_period_i_do")} — {period.i_do_minutes ?? 5} {tr("wp_minutes")}
        </span>
        <textarea className={fieldClass} rows={3} value={period.i_do ?? ""} onChange={(e) => set("i_do", e.target.value)} />
      </label>

      <label className="block text-sm">
        <span className="font-semibold text-foreground">
          {tr("wp_period_we_do")} — {period.we_do_minutes ?? 5} {tr("wp_minutes")}
        </span>
        <textarea className={fieldClass} rows={3} value={period.we_do ?? ""} onChange={(e) => set("we_do", e.target.value)} />
      </label>

      <label className="block text-sm">
        <span className="font-semibold text-foreground">
          {tr("wp_period_mid")} — {period.mid_assessment_minutes ?? 5} {tr("wp_minutes")}
        </span>
        <textarea
          className={fieldClass}
          rows={3}
          value={period.mid_assessment ?? ""}
          onChange={(e) => set("mid_assessment", e.target.value)}
        />
      </label>

      <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
        <p className="text-sm font-semibold text-foreground">
          {tr("wp_period_you_do")} — {period.you_do_minutes ?? 20} {tr("wp_minutes")}
        </p>
        <label className="block text-sm">
          <span className="text-orange-700 font-medium">{tr("wp_you_do_developing")}</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={period.you_do?.developing ?? ""}
            onChange={(e) => setYouDo("developing", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-yellow-700 font-medium">{tr("wp_you_do_securing")}</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={period.you_do?.securing ?? ""}
            onChange={(e) => setYouDo("securing", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-emerald-700 font-medium">{tr("wp_you_do_mastering")}</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={period.you_do?.mastering ?? ""}
            onChange={(e) => setYouDo("mastering", e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-blue-700 font-medium">{tr("wp_you_do_extension")}</span>
          <textarea
            className={fieldClass}
            rows={2}
            value={period.you_do?.extension ?? ""}
            onChange={(e) => setYouDo("extension", e.target.value)}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-semibold text-foreground">
          {tr("wp_period_exit")} — {period.exit_ticket_minutes ?? 5} {tr("wp_minutes")}
        </span>
        <textarea
          className={fieldClass}
          rows={2}
          value={period.exit_ticket ?? ""}
          onChange={(e) => set("exit_ticket", e.target.value)}
        />
      </label>

      <label className="block text-sm">
        <span className="font-semibold text-foreground">{tr("wp_period_sir")}</span>
        <select
          className={fieldClass}
          value={period.sir_method ?? ""}
          onChange={(e) => set("sir_method", e.target.value)}
        >
          <option value="">{tr("wp_select_placeholder")}</option>
          {sirMethods.map((item) => (
            <option key={item.id} value={masterListItemValue(item)}>
              {masterListItemLabel(item, lang)}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-semibold text-foreground">{tr("wp_period_homework")}</span>
        <textarea
          className={fieldClass}
          rows={2}
          value={period.homework ?? ""}
          onChange={(e) => set("homework", e.target.value)}
        />
      </label>
    </div>
  );
}
