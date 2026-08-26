import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllAssignmentsAdmin,
  fetchAllSubmissionsAdmin,
  gradeAssignmentSubmission,
  statusBadgeClass,
  assignmentTitle,
  type AssignmentSubmissionRow,
} from "@/lib/assignment";
import { fetchScopedStudents } from "@/lib/teacher-dashboard";
import { useI18n } from "@/lib/i18n";
import { AdminAssignmentSubmissionFile } from "@/components/admin-assignment-submission-file";

export const Route = createFileRoute("/teacher/assignments/submissions/")({
  component: TeacherAssignmentSubmissionsPage,
});

function TeacherAssignmentSubmissionsPage() {
  const { bi, tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<AssignmentSubmissionRow[]>([]);
  const [studentNames, setStudentNames] = useState<Map<string, string>>(new Map());
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof fetchAllAssignmentsAdmin>>["data"]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [aRes, sRes, students] = await Promise.all([
        fetchAllAssignmentsAdmin(),
        fetchAllSubmissionsAdmin(),
        fetchScopedStudents(),
      ]);
      if (aRes.error) toast.error(aRes.error);
      else setAssignments(aRes.data);
      if (sRes.error) toast.error(sRes.error);
      else setSubmissions(sRes.data);
      setStudentNames(new Map(students.map((s) => [s.userId, s.displayName])));
      setLoading(false);
    })();
  }, []);

  const assignmentMap = useMemo(
    () => new Map((assignments ?? []).map((a) => [a.id, a])),
    [assignments],
  );

  async function grade(sub: AssignmentSubmissionRow, score: number) {
    setGradingId(sub.id);
    const { data: auth } = await supabase.auth.getUser();
    const a = assignmentMap.get(sub.assignment_id);
    const { error } = await gradeAssignmentSubmission({
      submissionId: sub.id,
      score,
      maxPoints: a?.max_points ?? sub.max_points ?? 100,
      feedbackEn: "",
      feedbackAr: "",
      gradedBy: auth.user?.id ?? "",
    });
    setGradingId(null);
    if (error) toast.error(error);
    else {
      toast.success(tr("teacher_assignment_graded"));
      const sRes = await fetchAllSubmissionsAdmin();
      if (!sRes.error) setSubmissions(sRes.data);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_manage_assignments")}</h2>
      <ul className="space-y-3">
        {submissions.map((sub) => {
          const a = assignmentMap.get(sub.assignment_id);
          return (
            <li key={sub.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">{studentNames.get(sub.student_id) ?? sub.student_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {a ? bi(assignmentTitle(a)) : sub.assignment_id}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(sub.status)}`}>
                  {sub.status}
                </span>
              </div>
              {sub.text_response && (
                <p className="text-sm text-muted-foreground">{sub.text_response}</p>
              )}
              {sub.file_path && (
                <AdminAssignmentSubmissionFile
                  filePath={sub.file_path}
                  fileName={sub.file_name ?? "file"}
                  fileMime={sub.file_mime}
                />
              )}
              {sub.status !== "graded" && a && (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={a.max_points}
                    defaultValue={sub.score ?? ""}
                    className="w-24 rounded border border-border px-2 py-1 text-sm"
                    id={`score-${sub.id}`}
                  />
                  <button
                    type="button"
                    disabled={gradingId === sub.id}
                    onClick={() => {
                      const el = document.getElementById(`score-${sub.id}`) as HTMLInputElement | null;
                      const score = Number(el?.value ?? 0);
                      void grade(sub, score);
                    }}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    {tr("teacher_grade")}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
