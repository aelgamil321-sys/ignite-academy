import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  TrendingUp,
  Users,
  UserCheck,
  AlertCircle,
  BarChart3,
  Loader2,
} from "lucide-react";
import { TeacherDashboardSection } from "@/components/teacher-dashboard-section";
import type { AdminAnalyticsSnapshot } from "@/lib/admin-analytics";
import { useI18n } from "@/lib/i18n";
import {
  formatAnalyticsPct,
  leaderboardStudentName,
} from "@/lib/teacher-analytics-ui";
import type { ScopedStudentRow } from "@/lib/teacher-dashboard";
import { gradeDisplayName } from "@/lib/grade-utils";
import { sectionLabel, islamicGroupLabel } from "@/lib/student-academics";
export type TeacherStudentOverviewProps = {
  snapshot?: AdminAnalyticsSnapshot | null;
  students?: ScopedStudentRow[];
  loading?: boolean;
  error?: boolean;
};

const PREVIEW_LIMIT = 4;

export function TeacherStudentOverview({
  snapshot,
  students = [],
  loading = false,
  error = false,
}: TeacherStudentOverviewProps) {
  const { tr, dir, lang } = useI18n();

  const studentsWithScores = students.filter((student) => student.avgQuizScore !== null).length;
  const topPreview = snapshot?.topStudents.slice(0, PREVIEW_LIMIT) ?? [];
  const followUpPreview = snapshot?.atRiskStudents.slice(0, PREVIEW_LIMIT) ?? [];

  const metricCards = snapshot
    ? [
        {
          key: "total",
          icon: Users,
          label: tr("teacher_overview_total_students"),
          value: String(snapshot.summary.studentCount),
        },
        {
          key: "avg",
          icon: BarChart3,
          label: tr("teacher_dash_kpi_avg_performance"),
          value: formatAnalyticsPct(snapshot.summary.averageScorePct),
        },
        {
          key: "activity",
          icon: UserCheck,
          label: tr("teacher_overview_with_scores"),
          value: String(studentsWithScores),
        },
        {
          key: "followup",
          icon: AlertCircle,
          label: tr("teacher_overview_need_followup"),
          value: String(snapshot.atRiskStudents.length),
        },
      ]
    : [];

  return (
    <TeacherDashboardSection
      title={tr("teacher_dash_section_student_overview")}
      icon={<Users className="h-5 w-5" />}
      action={
        <Link
          to="/teacher/performance"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          {tr("teacher_overview_view_performance")}
          <ArrowRight className={`h-3.5 w-3.5 ${dir === "rtl" ? "rotate-180" : ""}`} />
        </Link>
      }
    >
      {loading ? (
        <div className="flex min-h-[160px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tr("teacher_loading")}
        </div>
      ) : error ? (
        <p className="rounded-xl border border-border/80 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
          {tr("teacher_dash_widget_load_error")}
        </p>
      ) : !snapshot ? (
        <p className="rounded-xl border border-border/80 bg-muted/15 px-4 py-6 text-center text-sm text-muted-foreground">
          {tr("teacher_analytics_not_permitted")}
        </p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {metricCards.map((card) => (
              <div
                key={card.key}
                className="rounded-xl border border-border bg-muted/10 px-3 py-3 sm:px-4 sm:py-4"
              >
                <card.icon className="mb-2 h-4 w-4 text-primary" />
                <p className="font-display text-xl text-foreground sm:text-2xl">{card.value}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                  {card.label}
                </p>
              </div>
            ))}
          </div>

          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-border bg-background/60 p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">
                  {tr("teacher_overview_top_students")}
                </h4>
              </div>
              {topPreview.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tr("teacher_perf_top_empty")}</p>
              ) : (
                <ul className="space-y-2.5">
                  {topPreview.map((row) => (
                    <li
                      key={row.rank}
                      className="flex items-start justify-between gap-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {leaderboardStudentName(row, lang)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {gradeDisplayName(row.gradeSlug, lang)}
                          {row.section ? ` · ${sectionLabel(row.section, lang)}` : ""}
                          {row.islamicGroup
                            ? ` · ${islamicGroupLabel(row.islamicGroup, lang)}`
                            : ""}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-primary">
                        {formatAnalyticsPct(row.averageScorePct)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="min-w-0 rounded-xl border border-border bg-background/60 p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <h4 className="text-sm font-semibold text-foreground">
                  {tr("teacher_overview_need_followup")}
                </h4>
              </div>
              {followUpPreview.length === 0 ? (
                <p className="text-xs text-muted-foreground">{tr("teacher_perf_followup_empty")}</p>
              ) : (
                <ul className="space-y-2.5">
                  {followUpPreview.map((row, index) => (
                    <li
                      key={`${row.nameEn}-${index}`}
                      className="flex items-start justify-between gap-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {leaderboardStudentName(row, lang)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {lang === "ar" ? row.gradeLabelAr : row.gradeLabelEn}
                          {row.section ? ` · ${sectionLabel(row.section, lang)}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-amber-700">
                        {formatAnalyticsPct(row.averageScorePct)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </TeacherDashboardSection>
  );
}
