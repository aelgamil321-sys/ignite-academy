import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminAnalyticsSnapshot } from "@/lib/admin-analytics";
import {
  fetchTeacherAnalytics,
  teacherCanUseAnalyticsFilter,
  type TeacherAnalyticsScope,
} from "@/lib/teacher-analytics";
import {
  resolveTeacherReportFilters,
  safeBuildClassReport,
  safeBuildSectionReport,
  safeBuildStudentReport,
  type ClassReportData,
  type SectionReportData,
} from "@/lib/teacher-reports";
import {
  fetchScopedStudents,
  fetchTeacherContext,
  filterStudentsByTeacherScope,
  type ScopedStudentRow,
  type TeacherContext,
} from "@/lib/teacher-dashboard";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { formatAnalyticsPct, leaderboardStudentName } from "@/lib/teacher-analytics-ui";
import { sectionLabel } from "@/lib/student-academics";
import type { StudentSection } from "@/lib/student-academics";

type ReportKind = "class" | "section" | "student";

const EMPTY_FILTERS = { grade: "", section: "", islamicGroup: "" } as const;

function EvidenceList({
  title,
  items,
  tr,
}: {
  title: string;
  items: Array<{ labelKey: string; value: string }>;
  tr: (key: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-foreground">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={`${item.labelKey}-${item.value}`} className="text-sm text-muted-foreground">
            {tr(item.labelKey)}: <span className="font-medium text-foreground">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportMetrics({
  report,
  tr,
}: {
  report: ClassReportData | SectionReportData;
  tr: (key: string) => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Metric label={tr("teacher_overview_total_students")} value={String(report.studentCount)} />
      <Metric
        label={tr("teacher_dash_kpi_avg_performance")}
        value={formatAnalyticsPct(report.averageScorePct)}
      />
      <Metric
        label={tr("teacher_overview_with_scores")}
        value={String(report.studentsWithScores)}
      />
      <Metric label={tr("teacher_overview_need_followup")} value={String(report.atRiskCount)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 px-3 py-3">
      <p className="font-display text-xl text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ReportEmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

export function TeacherReportsPage() {
  const { tr, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [context, setContext] = useState<TeacherContext | null>(null);
  const [students, setStudents] = useState<ScopedStudentRow[]>([]);
  const [snapshot, setSnapshot] = useState<AdminAnalyticsSnapshot | null>(null);
  const [kind, setKind] = useState<ReportKind>("class");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedSection, setSelectedSection] = useState<StudentSection | "">("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const loadReports = useCallback(async (activeRef: { current: boolean }) => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const ctx = await fetchTeacherContext(auth.user.id);
      const allStudents = await fetchScopedStudents();
      const scopedStudents = filterStudentsByTeacherScope(allStudents, ctx);

      const scope: TeacherAnalyticsScope = {
        isLeadTeacher: ctx.isLeadTeacher,
        assignments: ctx.assignments,
      };

      let analytics: AdminAnalyticsSnapshot | null = null;
      if (teacherCanUseAnalyticsFilter(scope, EMPTY_FILTERS)) {
        const res = await fetchTeacherAnalytics(scope, EMPTY_FILTERS);
        analytics = res.error ? null : res.data;
      }

      if (!activeRef.current) return;

      setContext(ctx);
      setStudents(scopedStudents);
      setSnapshot(analytics);
    } catch {
      if (activeRef.current) setLoadError(true);
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeRef = { current: true };
    void loadReports(activeRef);
    return () => {
      activeRef.current = false;
    };
  }, [reloadToken, loadReports]);

  const filters = useMemo(
    () =>
      resolveTeacherReportFilters(context, students, {
        grade: selectedGrade,
        section: selectedSection,
        studentId: selectedStudentId,
      }),
    [context, students, selectedGrade, selectedSection, selectedStudentId],
  );

  const {
    gradeOptions,
    effectiveGrade,
    sectionOptions,
    effectiveSection,
    studentOptions,
    effectiveStudentId,
  } = filters;

  const classReport = useMemo(
    () => safeBuildClassReport(effectiveGrade, students, snapshot, lang),
    [effectiveGrade, students, snapshot, lang],
  );

  const sectionReport = useMemo(
    () => safeBuildSectionReport(effectiveGrade, effectiveSection, students, snapshot, lang),
    [effectiveGrade, effectiveSection, students, snapshot, lang],
  );

  const studentReport = useMemo(
    () => safeBuildStudentReport(effectiveStudentId, studentOptions, lang),
    [effectiveStudentId, studentOptions, lang],
  );

  const handleGradeChange = (nextGrade: string) => {
    setSelectedGrade(nextGrade);
    setSelectedSection("");
    setSelectedStudentId("");
  };

  const handleSectionChange = (nextSection: StudentSection) => {
    setSelectedSection(nextSection);
    setSelectedStudentId("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-4xl">
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="text-sm text-muted-foreground">{tr("teacher_reports_load_error")}</p>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {tr("teacher_reports_retry")}
          </button>
        </div>
      </div>
    );
  }

  const noScope =
    !context?.isLeadTeacher && context?.assignments.length === 0 && students.length === 0;

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-5 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-foreground">{tr("teacher_nav_reports")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tr("teacher_reports_lead")}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium print:hidden"
        >
          <Printer className="h-4 w-4" />
          {tr("teacher_report_print")}
        </button>
      </div>

      {noScope ? (
        <ReportEmptyState message={tr("teacher_no_students")} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2 print:hidden">
            {(["class", "section", "student"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`min-h-10 rounded-lg px-4 text-sm font-medium ${
                  kind === k
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-foreground"
                }`}
              >
                {tr(
                  k === "class"
                    ? "teacher_report_class"
                    : k === "section"
                      ? "teacher_report_section"
                      : "teacher_report_student",
                )}
              </button>
            ))}
          </div>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] print:border-0 print:shadow-none">
            <div className="mb-4 grid gap-3 sm:grid-cols-2 print:hidden">
              {kind !== "student" ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">
                    {tr("teacher_assigned_grades")}
                  </span>
                  {gradeOptions.length > 0 ? (
                    <select
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5"
                      value={effectiveGrade}
                      onChange={(e) => handleGradeChange(e.target.value)}
                    >
                      {gradeOptions.map((g) => (
                        <option key={g} value={g}>
                          {gradeDisplayName(g, lang)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-muted-foreground">{tr("teacher_no_classes")}</p>
                  )}
                </label>
              ) : null}
              {kind === "section" ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">
                    {tr("teacher_assigned_sections")}
                  </span>
                  {sectionOptions.length > 0 && effectiveSection ? (
                    <select
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5"
                      value={effectiveSection}
                      onChange={(e) => handleSectionChange(e.target.value as StudentSection)}
                    >
                      {sectionOptions.map((s) => (
                        <option key={s} value={s}>
                          {sectionLabel(s, lang)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-muted-foreground">{tr("teacher_report_no_sections")}</p>
                  )}
                </label>
              ) : null}
              {kind === "student" ? (
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-muted-foreground">{tr("teacher_nav_students")}</span>
                  {studentOptions.length > 0 && effectiveStudentId ? (
                    <select
                      className="w-full rounded-lg border border-border bg-background px-3 py-2.5"
                      value={effectiveStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={!effectiveGrade}
                    >
                      {studentOptions.map((s) => (
                        <option key={s.userId} value={s.userId}>
                          {s.displayName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-muted-foreground">{tr("teacher_no_students")}</p>
                  )}
                </label>
              ) : null}
            </div>

            {kind === "class" && effectiveGrade && classReport ? (
              <div className="space-y-5">
                <h2 className="font-display text-lg text-foreground">
                  {tr("teacher_report_class")}: {classReport.gradeLabel}
                </h2>
                <ReportMetrics report={classReport} tr={tr} />
                {classReport.strengths.length === 0 && classReport.needsSupport.length === 0 ? (
                  <ReportEmptyState message={tr("teacher_report_no_data")} />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <EvidenceList
                      title={tr("teacher_report_strengths")}
                      items={classReport.strengths}
                      tr={tr}
                    />
                    <EvidenceList
                      title={tr("teacher_report_needs_support")}
                      items={classReport.needsSupport}
                      tr={tr}
                    />
                  </div>
                )}
                {classReport.topStudents.length > 0 ? (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">{tr("teacher_overview_top_students")}</h4>
                    <ul className="space-y-1 text-sm">
                      {classReport.topStudents.map((row) => (
                        <li key={`${row.userId}-${row.rank}`} className="flex justify-between gap-2">
                          <span>{leaderboardStudentName(row, lang)}</span>
                          <span className="font-medium text-primary">
                            {formatAnalyticsPct(row.averageScorePct)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            {kind === "class" && effectiveGrade && !classReport ? (
              <ReportEmptyState message={tr("teacher_report_no_data")} />
            ) : null}

            {kind === "class" && !effectiveGrade ? (
              <ReportEmptyState message={tr("teacher_no_classes")} />
            ) : null}

            {kind === "section" && effectiveGrade && effectiveSection && sectionReport ? (
              <div className="space-y-5">
                <h2 className="font-display text-lg text-foreground">
                  {tr("teacher_report_section")}: {sectionReport.gradeLabel} —{" "}
                  {sectionReport.sectionLabel}
                </h2>
                <ReportMetrics report={sectionReport} tr={tr} />
                {sectionReport.strengths.length === 0 && sectionReport.needsSupport.length === 0 ? (
                  <ReportEmptyState
                    message={
                      sectionReport.studentCount === 0
                        ? tr("teacher_report_no_section_students")
                        : tr("teacher_report_no_data")
                    }
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <EvidenceList
                      title={tr("teacher_report_strengths")}
                      items={sectionReport.strengths}
                      tr={tr}
                    />
                    <EvidenceList
                      title={tr("teacher_report_needs_support")}
                      items={sectionReport.needsSupport}
                      tr={tr}
                    />
                  </div>
                )}
              </div>
            ) : kind === "section" ? (
              <ReportEmptyState
                message={
                  !effectiveGrade
                    ? tr("teacher_no_classes")
                    : sectionOptions.length === 0 || !effectiveSection
                      ? tr("teacher_report_no_sections")
                      : tr("teacher_report_no_data")
                }
              />
            ) : null}

            {kind === "student" && studentReport ? (
              <div className="space-y-5">
                <h2 className="font-display text-lg text-foreground">
                  {tr("teacher_report_student")}: {studentReport.student.displayName}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric label={tr("teacher_assigned_grades")} value={studentReport.gradeLabel} />
                  <Metric label={tr("teacher_assigned_sections")} value={studentReport.sectionLabel} />
                  <Metric label={tr("teacher_assigned_groups")} value={studentReport.groupLabel} />
                  <Metric
                    label={tr("teacher_dash_kpi_avg_performance")}
                    value={
                      studentReport.student.avgQuizScore === null
                        ? "—"
                        : `${studentReport.student.avgQuizScore}%`
                    }
                  />
                </div>
                {studentReport.strengths.length === 0 && studentReport.needsSupport.length === 0 ? (
                  <ReportEmptyState message={tr("teacher_report_no_data")} />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <EvidenceList
                      title={tr("teacher_report_strengths")}
                      items={studentReport.strengths}
                      tr={tr}
                    />
                    <EvidenceList
                      title={tr("teacher_report_needs_support")}
                      items={studentReport.needsSupport}
                      tr={tr}
                    />
                  </div>
                )}
              </div>
            ) : null}

            {kind === "student" && !studentReport ? (
              <ReportEmptyState
                message={
                  studentOptions.length === 0
                    ? tr("teacher_no_students")
                    : tr("teacher_report_select_student")
                }
              />
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
