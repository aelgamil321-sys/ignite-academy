import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChartBar,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  School,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import {
  fetchScopedStudents,
  fetchTeacherContext,
  fetchTeacherOverviewStats,
  formatClassScopeLabel,
  type TeacherContext,
  type TeacherOverviewStats,
  type ScopedStudentRow,
} from "@/lib/teacher-dashboard";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";

export const Route = createFileRoute("/teacher/")({
  component: TeacherOverviewPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-display text-2xl text-foreground">{value}</p>
    </div>
  );
}

function TeacherOverviewPage() {
  const { lang, tr, trf } = useI18n();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<TeacherContext | null>(null);
  const [stats, setStats] = useState<TeacherOverviewStats | null>(null);
  const [students, setStudents] = useState<ScopedStudentRow[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const ctx = await fetchTeacherContext(auth.user.id);
        const scopedStudents = await fetchScopedStudents();
        const overview = await fetchTeacherOverviewStats(ctx, scopedStudents);
        if (!active) return;
        setContext(ctx);
        setStudents(scopedStudents);
        setStats(overview);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const scopeSummary = useMemo(() => {
    if (!context) return { grades: "", sections: "", groups: "" };
    const grades = [...new Set(context.assignments.map((a) => a.grade))];
    const sections = context.assignments
      .map((a) => a.section)
      .filter(Boolean) as string[];
    const groups = context.assignments
      .map((a) => a.islamic_group)
      .filter(Boolean) as string[];
    return {
      grades: grades.map((g) => gradeDisplayName(g, lang)).join(", ") || "—",
      sections:
        sections.length > 0
          ? sections.map((s) => sectionLabel(s as "A", lang)).join(", ")
          : tr("teacher_all_sections"),
      groups:
        groups.length > 0
          ? groups.map((g) => islamicGroupLabel(g as "A", lang)).join(", ")
          : tr("teacher_all_groups"),
    };
  }, [context, lang, tr]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  if (!context || !stats) {
    return <p className="text-sm text-muted-foreground">{tr("teacher_load_error")}</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-display text-xl text-foreground mb-1">
          {trf("teacher_welcome_name", { name: context.fullName })}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{tr("teacher_scope_lead")}</p>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {tr("teacher_assigned_grades")}
            </span>
            <p className="font-medium">{scopeSummary.grades}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {tr("teacher_assigned_sections")}
            </span>
            <p className="font-medium">{scopeSummary.sections}</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {tr("teacher_assigned_groups")}
            </span>
            <p className="font-medium">{scopeSummary.groups}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label={tr("teacher_stat_students")} value={String(stats.studentCount)} />
        <StatCard icon={School} label={tr("teacher_stat_classes")} value={String(stats.classCount)} />
        <StatCard icon={BookOpen} label={tr("teacher_stat_lessons")} value={String(stats.lessonCount)} />
        <StatCard
          icon={ChartBar}
          label={tr("teacher_stat_avg_quiz")}
          value={stats.avgQuizScore === null ? "—" : `${stats.avgQuizScore}%`}
        />
        <StatCard icon={ClipboardCheck} label={tr("teacher_stat_quizzes")} value={String(stats.quizCount)} />
        <StatCard
          icon={GraduationCap}
          label={tr("teacher_stat_assignments")}
          value={String(stats.assignmentCount)}
        />
        <StatCard
          icon={ClipboardCheck}
          label={tr("teacher_stat_submitted")}
          value={String(stats.submittedAssignmentsCount)}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-lg">{tr("teacher_my_classes")}</h3>
          <Link to="/teacher/classes" className="text-sm font-semibold text-primary hover:underline">
            {tr("view_all")}
          </Link>
        </div>
        <ul className="space-y-2">
          {context.assignments.map((a) => (
            <li key={a.id}>
              <Link
                to="/teacher/students"
                search={{
                  grade: a.grade,
                  section: a.section ?? "",
                  islamic_group: a.islamic_group ?? "",
                }}
                className="block rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/50"
              >
                {formatClassScopeLabel(a, lang)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-display text-lg">{tr("teacher_nav_students")}</h3>
          <Link to="/teacher/students" className="text-sm font-semibold text-primary hover:underline">
            {tr("view_all")}
          </Link>
        </div>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{tr("teacher_no_students")}</p>
        ) : (
          <ul className="space-y-2">
            {students.slice(0, 5).map((s) => (
              <li key={s.userId}>
                <Link
                  to="/teacher/students/$studentId"
                  params={{ studentId: s.userId }}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/50"
                >
                  <span className="font-medium">{s.displayName}</span>
                  <span className="text-muted-foreground">{s.progressPct}%</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
