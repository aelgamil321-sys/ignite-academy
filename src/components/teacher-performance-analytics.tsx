import {
  AlertCircle,
  Award,
  BarChart3,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { AdminTableScroll } from "@/components/admin-table-scroll";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  ANALYTICS_UNSET_KEY,
  type AdminAnalyticsSnapshot,
  type AnalyticsGroupRow,
  type AtRiskStudentRow,
  type StudentLeaderboardRow,
} from "@/lib/admin-analytics";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n, L } from "@/lib/i18n";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";
import type { TeacherAnalyticsScope } from "@/lib/teacher-analytics";
import {
  buildTeacherClassComparisonRows,
  filterIslamicGroupCardsForScope,
  formatAnalyticsPct,
  formatTeacherScopeSummary,
  leaderboardStudentName,
} from "@/lib/teacher-analytics-ui";

const chartConfig = {
  score: {
    label: "Avg. score",
    color: "#F2B21B",
  },
};

function AnalyticsGroupTable({
  title,
  rows,
  lang,
  emptyLabel,
}: {
  title: string;
  rows: AnalyticsGroupRow[];
  lang: "en" | "ar";
  emptyLabel: string;
}) {
  const headers = {
    group: L("Group", "المجموعة")[lang],
    students: L("Students", "الطلاب")[lang],
    avgScore: L("Avg. quiz score", "متوسط درجات الاختبار")[lang],
    submissions: L("Submissions", "الإرسالات")[lang],
  };

  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h3 className="mb-3 font-display text-lg text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h3 className="mb-4 font-display text-lg text-foreground">{title}</h3>
      <AdminTableScroll>
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-3 pe-4 font-medium">{headers.group}</th>
              <th className="pb-3 pe-4 font-medium text-end">{headers.students}</th>
              <th className="pb-3 pe-4 font-medium text-end">{headers.avgScore}</th>
              <th className="pb-3 font-medium text-end">{headers.submissions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/70 last:border-0">
                <td className="py-3 pe-4 font-medium text-foreground">
                  {L(row.labelEn, row.labelAr)[lang]}
                </td>
                <td className="py-3 pe-4 text-end text-foreground">{row.studentCount}</td>
                <td className="py-3 pe-4 text-end font-semibold text-primary">
                  {formatAnalyticsPct(row.averageScorePct)}
                </td>
                <td className="py-3 text-end text-muted-foreground">{row.submissionCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableScroll>
    </section>
  );
}

function GroupBarChart({
  title,
  rows,
  lang,
}: {
  title: string;
  rows: Array<{ label: string; score: number; hasData: boolean; studentCount: number }>;
  lang: "en" | "ar";
}) {
  const noDataLabel = L("No data", "لا توجد بيانات")[lang];
  const chartData = rows.map((row) => ({
    label: row.label,
    score: row.hasData ? row.score : 0,
  }));

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <h3 className="mb-4 font-display text-lg text-foreground">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{noDataLabel}</p>
      ) : (
        <>
          <ul className="mb-4 space-y-1.5 text-sm">
            {rows.map((row) => (
              <li key={row.label} className="flex justify-between gap-2 text-muted-foreground">
                <span className="text-foreground">{row.label}</span>
                <span className="font-semibold text-primary">
                  {row.hasData ? `${row.score}%` : noDataLabel}
                  <span className="ms-2 font-normal text-muted-foreground">
                    ({row.studentCount} {L("students", "طالب")[lang]})
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <ChartContainer config={chartConfig} className="h-[220px] w-full min-w-[240px]">
            <BarChart data={chartData} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                interval={0}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                domain={[0, 100]}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="score" fill="var(--color-score)" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ChartContainer>
        </>
      )}
    </section>
  );
}

function TopStudentsSection({
  rows,
  lang,
}: {
  rows: StudentLeaderboardRow[];
  lang: "en" | "ar";
}) {
  const T = {
    title: L("Top students", "أفضل الطلاب")[lang],
    empty: L("No ranked students for current filters.", "لا يوجد طلاب مصنّفون للفلاتر الحالية.")[lang],
    student: L("Student", "الطالب")[lang],
    grade: L("Grade", "الصف")[lang],
    section: L("Section", "الشعبة")[lang],
    islamicGroup: L("Islamic Group", "المجموعة الإسلامية")[lang],
    avgScore: L("Avg. score", "متوسط الدرجة")[lang],
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg text-foreground">{T.title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{T.empty}</p>
      ) : (
        <AdminTableScroll>
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pe-4 font-medium">{T.student}</th>
                <th className="pb-3 pe-4 font-medium">{T.grade}</th>
                <th className="pb-3 pe-4 font-medium">{T.section}</th>
                <th className="pb-3 pe-4 font-medium">{T.islamicGroup}</th>
                <th className="pb-3 font-medium text-end">{T.avgScore}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.rank} className="border-b border-border/70 last:border-0">
                  <td className="py-3 pe-4 font-medium text-foreground">
                    {leaderboardStudentName(row, lang)}
                  </td>
                  <td className="py-3 pe-4 text-foreground">
                    {L(row.gradeLabelEn, row.gradeLabelAr)[lang]}
                  </td>
                  <td className="py-3 pe-4 text-foreground">{sectionLabel(row.section, lang)}</td>
                  <td className="py-3 pe-4 text-foreground">
                    {islamicGroupLabel(row.islamicGroup, lang)}
                  </td>
                  <td className="py-3 text-end font-semibold text-primary">
                    {formatAnalyticsPct(row.averageScorePct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
      )}
    </section>
  );
}

function FollowUpStudentsSection({
  rows,
  lang,
}: {
  rows: AtRiskStudentRow[];
  lang: "en" | "ar";
}) {
  const T = {
    title: L("Students needing follow-up", "طلاب يحتاجون متابعة")[lang],
    subtitle: L(
      "Average score below 60% or no certificates earned.",
      "متوسط الدرجة أقل من 60٪ أو لم يحصلوا على شهادات.",
    )[lang],
    empty: L("No students need follow-up for current filters.", "لا يوجد طلاب يحتاجون متابعة للفلاتر الحالية.")[
      lang
    ],
    name: L("Name", "الاسم")[lang],
    grade: L("Grade", "الصف")[lang],
    section: L("Section", "الشعبة")[lang],
    avgScore: L("Avg. score", "متوسط الدرجة")[lang],
  };

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-4 flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <h3 className="font-display text-lg text-foreground">{T.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{T.subtitle}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{T.empty}</p>
      ) : (
        <AdminTableScroll>
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pe-4 font-medium">{T.name}</th>
                <th className="pb-3 pe-4 font-medium">{T.grade}</th>
                <th className="pb-3 pe-4 font-medium">{T.section}</th>
                <th className="pb-3 font-medium text-end">{T.avgScore}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.nameEn}-${index}`} className="border-b border-border/70 last:border-0">
                  <td className="py-3 pe-4 font-medium text-foreground">
                    {leaderboardStudentName(row, lang)}
                  </td>
                  <td className="py-3 pe-4 text-foreground">
                    {L(row.gradeLabelEn, row.gradeLabelAr)[lang]}
                  </td>
                  <td className="py-3 pe-4 text-foreground">{sectionLabel(row.section, lang)}</td>
                  <td className="py-3 text-end font-semibold text-amber-700">
                    {formatAnalyticsPct(row.averageScorePct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
      )}
    </section>
  );
}

export type TeacherPerformanceAnalyticsProps = {
  data: AdminAnalyticsSnapshot;
  scope: TeacherAnalyticsScope;
};

export function TeacherPerformanceAnalytics({ data, scope }: TeacherPerformanceAnalyticsProps) {
  const { lang, tr } = useI18n();

  const islamicCards = filterIslamicGroupCardsForScope(data, scope);
  const classComparison = buildTeacherClassComparisonRows(data, scope, lang);

  const gradeChartRows = data.byGrade
    .filter((row) => row.key !== ANALYTICS_UNSET_KEY && row.studentCount > 0)
    .map((row) => ({
      label: L(row.labelEn, row.labelAr)[lang],
      score: row.averageScorePct ?? 0,
      hasData: row.averageScorePct !== null,
      studentCount: row.studentCount,
    }));

  const sectionChartRows = data.bySection
    .filter((row) => row.key !== ANALYTICS_UNSET_KEY && row.studentCount > 0)
    .map((row) => ({
      label: L(row.labelEn, row.labelAr)[lang],
      score: row.averageScorePct ?? 0,
      hasData: row.averageScorePct !== null,
      studentCount: row.studentCount,
    }));

  const summaryCards = [
    {
      key: "students",
      icon: Users,
      label: tr("teacher_stat_students"),
      value: String(data.summary.studentCount),
    },
    {
      key: "avg",
      icon: BarChart3,
      label: tr("teacher_stat_avg_quiz"),
      value: formatAnalyticsPct(data.summary.averageScorePct),
    },
    {
      key: "subs",
      icon: ClipboardCheck,
      label: tr("teacher_stat_submitted"),
      value: String(data.summary.submissionCount),
    },
    {
      key: "certs",
      icon: Award,
      label: tr("teacher_col_certificates"),
      value: String(data.summary.certificateCount),
    },
    {
      key: "followup",
      icon: AlertCircle,
      label: tr("teacher_overview_need_followup"),
      value: String(data.atRiskStudents.length),
    },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-3">
          <GraduationCap className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="font-display text-xl text-foreground sm:text-2xl">
              {tr("teacher_perf_page_title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{tr("teacher_perf_page_lead")}</p>
            <p className="mt-2 text-xs font-medium text-primary/90">
              {formatTeacherScopeSummary(scope, lang)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.key}
            className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5"
          >
            <card.icon className="mb-2 h-5 w-5 text-primary" />
            <div className="font-display text-xl text-foreground sm:text-2xl">{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{card.label}</div>
          </div>
        ))}
      </div>

      {classComparison.length > 1 ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg text-foreground">{tr("teacher_perf_class_comparison")}</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classComparison.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-border bg-muted/15 px-4 py-3"
              >
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tr("teacher_dash_student_count", { count: String(row.studentCount) })}
                </p>
                <p className="mt-2 font-display text-2xl text-primary">
                  {row.hasData ? formatAnalyticsPct(row.averageScorePct) : tr("teacher_perf_no_data")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {islamicCards.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg text-foreground">
              {tr("teacher_perf_by_islamic_group")}
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {islamicCards.map((card) => (
              <div key={card.group} className="rounded-xl border border-border bg-muted/15 p-4">
                <p className="text-xs uppercase tracking-wide text-primary">
                  {L(card.labelEn, card.labelAr)[lang]}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">{tr("teacher_stat_students")}</p>
                    <p className="mt-0.5 font-display text-xl text-foreground">{card.studentCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{tr("teacher_stat_avg_quiz")}</p>
                    <p className="mt-0.5 font-display text-xl text-primary">
                      {formatAnalyticsPct(card.averageScorePct)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{tr("teacher_col_certificates")}</p>
                    <p className="mt-0.5 font-display text-xl text-foreground">
                      {card.certificatesEarned}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <GroupBarChart title={tr("teacher_perf_by_grade")} rows={gradeChartRows} lang={lang} />
        <GroupBarChart title={tr("teacher_perf_by_section")} rows={sectionChartRows} lang={lang} />
      </div>

      <div className="grid gap-6 xl:grid-cols-1">
        <AnalyticsGroupTable
          title={tr("teacher_perf_by_grade")}
          rows={data.byGrade.filter((row) => row.key !== ANALYTICS_UNSET_KEY)}
          lang={lang}
          emptyLabel={tr("teacher_perf_grade_empty")}
        />
        <AnalyticsGroupTable
          title={tr("teacher_perf_by_section")}
          rows={data.bySection.filter((row) => row.key !== ANALYTICS_UNSET_KEY)}
          lang={lang}
          emptyLabel={tr("teacher_perf_section_empty")}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <TopStudentsSection rows={data.topStudents} lang={lang} />
        <FollowUpStudentsSection rows={data.atRiskStudents} lang={lang} />
      </div>
    </div>
  );
}

export function TeacherPerformanceLoading() {
  const { tr } = useI18n();
  return (
    <div className="flex items-center gap-2 py-10 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      {tr("teacher_perf_loading")}
    </div>
  );
}

export function TeacherPerformanceError({ onRetry }: { onRetry: () => void }) {
  const { tr } = useI18n();
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
      <p className="text-sm text-muted-foreground">{tr("teacher_perf_load_error")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {tr("teacher_perf_retry")}
      </button>
    </div>
  );
}
