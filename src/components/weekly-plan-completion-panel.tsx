import { useI18n } from "@/lib/i18n";
import {
  calculateWeeklyPlanCompletion,
  WEEKLY_PLAN_CORE_PLANNING_MAX,
  WEEKLY_PLAN_DIFFERENTIATION_MAX,
  WEEKLY_PLAN_PERIOD_MAX,
  WEEKLY_PLAN_REFLECTION_MAX,
  WEEKLY_PLAN_COMPLETION_TOTAL,
  type WeeklyPlanRow,
} from "@/lib/weekly-planning";

export function WeeklyPlanStatusBadge({
  status,
}: {
  status: WeeklyPlanRow["status"];
}) {
  const { tr } = useI18n();
  const styles =
    status === "complete"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : status === "in_progress"
        ? "bg-amber-100 text-amber-900 border-amber-200"
        : "bg-red-100 text-red-800 border-red-200";
  const label =
    status === "complete"
      ? tr("wp_status_complete")
      : status === "in_progress"
        ? tr("wp_status_in_progress")
        : tr("wp_status_not_started");
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
}

export function WeeklyPlanCompletionPanel({
  plan,
}: {
  plan: Pick<
    WeeklyPlanRow,
    | "teacher_id"
    | "phase"
    | "grade"
    | "section"
    | "islamic_group"
    | "student_count"
    | "day"
    | "plan_date"
    | "domain"
    | "success_criterion"
    | "learning_outcomes"
    | "unit"
    | "lesson_title"
    | "uae_culture"
    | "cross_curricular_real_life"
    | "p21_skills"
    | "key_vocabulary"
    | "resources"
    | "differentiation_sod"
    | "differentiation_eal"
    | "differentiation_gt"
    | "differentiation_emirati"
    | "first_period"
    | "second_period"
    | "teacher_reflection"
  >;
}) {
  const { tr } = useI18n();
  const c = calculateWeeklyPlanCompletion(plan);
  const pct = Math.round(c.percentage * 100);

  const nextAction =
    c.status === "complete"
      ? tr("wp_next_action_complete")
      : c.corePlanning < WEEKLY_PLAN_CORE_PLANNING_MAX
        ? tr("wp_next_action_core")
        : c.differentiation < WEEKLY_PLAN_DIFFERENTIATION_MAX
          ? tr("wp_next_action_diff")
          : c.firstPeriod < WEEKLY_PLAN_PERIOD_MAX
            ? tr("wp_next_action_first")
            : c.secondPeriod < WEEKLY_PLAN_PERIOD_MAX
              ? tr("wp_next_action_second")
              : tr("wp_next_action_reflection");

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg text-foreground">{tr("wp_completion_title")}</h3>
        <WeeklyPlanStatusBadge status={c.status} />
      </div>
      <div className="text-3xl font-bold text-primary">{pct}%</div>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li>
          {tr("wp_completion_core")}: {c.corePlanning}/{WEEKLY_PLAN_CORE_PLANNING_MAX}
        </li>
        <li>
          {tr("wp_completion_diff")}: {c.differentiation}/{WEEKLY_PLAN_DIFFERENTIATION_MAX}
        </li>
        <li>
          {tr("wp_completion_first")}: {c.firstPeriod}/{WEEKLY_PLAN_PERIOD_MAX}
        </li>
        <li>
          {tr("wp_completion_second")}: {c.secondPeriod}/{WEEKLY_PLAN_PERIOD_MAX}
        </li>
        <li>
          {tr("wp_completion_reflection")}: {c.reflection}/{WEEKLY_PLAN_REFLECTION_MAX}
        </li>
        <li className="font-semibold text-foreground pt-1">
          {tr("wp_completion_total")}: {c.completed}/{WEEKLY_PLAN_COMPLETION_TOTAL}
        </li>
      </ul>
      {c.missingFields.length > 0 ? (
        <div className="border-t border-border pt-2 space-y-1">
          <p className="text-xs font-semibold text-foreground">{tr("wp_completion_missing")}:</p>
          <ul className="space-y-0.5 text-xs text-muted-foreground">
            {c.missingFields.map((field) => (
              <li key={field.key}>
                {field.periodKey
                  ? `${tr(field.periodKey)}: ${tr(field.labelKey)}`
                  : tr(field.labelKey)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground border-t border-border pt-2">{nextAction}</p>
    </div>
  );
}
