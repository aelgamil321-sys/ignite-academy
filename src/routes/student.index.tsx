import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { StudentContinueLearning } from "@/components/student-continue-learning";
import { StudentDashboardHero } from "@/components/student-dashboard-hero";
import { StudentDashboardKpis } from "@/components/student-dashboard-kpis";
import { StudentNeedsAttention } from "@/components/student-needs-attention";
import { StudentProgressDashboard } from "@/components/student-progress-dashboard";
import { StudentQuickActions } from "@/components/student-quick-actions";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { fetchStudentAssignments, type AssignmentWithSubmission } from "@/lib/assignment";
import { gradeDisplayName } from "@/lib/grade-utils";
import { buildStudentAttentionItems } from "@/lib/student-dashboard-attention";
import { fetchStudentProgress, type StudentProgressData } from "@/lib/student-progress";
import { User } from "lucide-react";
import { useStudentShell } from "@/lib/student-shell-context";

export const Route = createFileRoute("/student/")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — Ignite Islamic Academy" },
      {
        name: "description",
        content: "Your student progress dashboard: lessons completed, quiz scores, and certificates.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: StudentDashboardPage,
});

function StudentDashboardPage() {
  const { tr, trf, lang, bi } = useI18n();
  const { userId, gradeSlug, hasGrade, profileComplete } = useStudentShell();
  const [progress, setProgress] = useState<StudentProgressData | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const myGrade = hasGrade ? grades.find((g) => g.slug === gradeSlug) : null;
  const gradeName = myGrade
    ? gradeDisplayName(myGrade.slug, lang) || bi(myGrade.name)
    : tr("not_set");

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      const [progressResult, assignmentsResult] = await Promise.all([
        fetchStudentProgress(userId),
        fetchStudentAssignments(userId),
      ]);
      if (!active) return;
      if (progressResult.error) setLoadError(progressResult.error);
      else setProgress(progressResult.data);
      if (!assignmentsResult.error) setAssignments(assignmentsResult.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const attentionItems = useMemo(
    () => (progress ? buildStudentAttentionItems(assignments, progress) : []),
    [assignments, progress],
  );

  return (
    <div className="space-y-6">
      <StudentDashboardHero />

      {!profileComplete && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>{tr("student_complete_profile_notice")}</p>
          <Link
            to="/student/profile"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <User className="h-3.5 w-3.5" />
            {tr("profile_student")}
          </Link>
        </div>
      )}

      {!hasGrade && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <p>{tr("student_my_lessons_complete_profile")}</p>
          <Link
            to="/student/profile"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <User className="h-3.5 w-3.5" />
            {tr("profile_student")}
          </Link>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{tr("student_loading_progress")}</div>
      ) : loadError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
          {trf("student_load_progress_error", { error: loadError })}
        </div>
      ) : progress ? (
        <>
          <StudentDashboardKpis progress={progress} />

          <div className="grid min-w-0 gap-4 lg:grid-cols-5 lg:gap-6">
            <div className="min-w-0 lg:col-span-3">
              <StudentContinueLearning
                progress={progress}
                gradeSlug={gradeSlug}
                hasGrade={hasGrade}
              />
            </div>
            <div className="min-w-0 lg:col-span-2">
              <StudentNeedsAttention items={attentionItems} />
            </div>
          </div>

          <StudentQuickActions />

          {hasGrade && myGrade ? (
            <StudentProgressDashboard
              progress={progress}
              gradeName={gradeName}
              gradeSlug={myGrade.slug}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
              {tr("student_my_lessons_complete_profile")}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
