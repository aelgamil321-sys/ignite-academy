import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { StudentProgressDashboard } from "@/components/student-progress-dashboard";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import {
  fetchScopedStudentDetail,
  fetchScopedStudents,
} from "@/lib/teacher-dashboard";
import type { StudentProgressData } from "@/lib/student-progress";

export const Route = createFileRoute("/teacher/students/$studentId")({
  component: TeacherStudentDetailPage,
});

function TeacherStudentDetailPage() {
  const { studentId } = Route.useParams();
  const { lang, tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<StudentProgressData | null>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const students = await fetchScopedStudents();
      const student = students.find((s) => s.userId === studentId);
      if (!student) {
        if (active) {
          setProgress(null);
          setLoading(false);
        }
        return;
      }
      const result = await fetchScopedStudentDetail(studentId);
      if (!active) return;
      setDisplayName(student.displayName);
      setProgress(result.data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="space-y-3">
        <Link to="/teacher/students" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4" />
          {tr("teacher_back_students")}
        </Link>
        <p className="text-sm text-destructive">{tr("teacher_student_not_found")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        to="/teacher/students"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {tr("teacher_back_students")}
      </Link>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-display text-xl text-foreground">{displayName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {gradeDisplayName(progress.gradeSlug, lang)}
        </p>
      </div>
      <StudentProgressDashboard
        progress={progress}
        gradeName={gradeDisplayName(progress.gradeSlug, lang)}
        gradeSlug={progress.gradeSlug}
      />
    </div>
  );
}
