import {
  BookOpen,
  ChartBar,
  ClipboardCheck,
  GraduationCap,
  School,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { TeacherOverviewStats } from "@/lib/teacher-dashboard";

type TeacherDashboardKpisProps = {
  stats: TeacherOverviewStats;
};

type KpiItem = {
  icon: typeof Users;
  labelKey: string;
  value: string;
  subtitleKey?: string;
};

export function TeacherDashboardKpis({ stats }: TeacherDashboardKpisProps) {
  const { tr } = useI18n();

  const items: KpiItem[] = [
    { icon: Users, labelKey: "teacher_stat_students", value: String(stats.studentCount) },
    { icon: School, labelKey: "teacher_stat_classes", value: String(stats.classCount) },
    { icon: BookOpen, labelKey: "teacher_stat_lessons", value: String(stats.lessonCount) },
    {
      icon: ClipboardCheck,
      labelKey: "teacher_stat_quizzes",
      value: String(stats.quizCount),
      subtitleKey: "teacher_dash_kpi_quiz_activity_hint",
    },
    { icon: GraduationCap, labelKey: "teacher_stat_assignments", value: String(stats.assignmentCount) },
    {
      icon: ChartBar,
      labelKey: "teacher_dash_kpi_avg_performance",
      value: stats.avgQuizScore === null ? "—" : `${stats.avgQuizScore}%`,
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.labelKey}
            className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5"
          >
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-[10px] font-semibold uppercase tracking-wide sm:text-xs">
                {tr(item.labelKey)}
              </span>
            </div>
            <p className="font-display text-2xl text-foreground sm:text-[1.65rem]">{item.value}</p>
            {item.subtitleKey ? (
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground sm:text-xs">
                {tr(item.subtitleKey)}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
