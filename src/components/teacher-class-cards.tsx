import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, ChartBar, Users } from "lucide-react";
import { TeacherDashboardSection } from "@/components/teacher-dashboard-section";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { gradeSlugToStageKey } from "@/lib/teacher-homepage";
import {
  studentMatchesClassFilter,
  type ScopedStudentRow,
  type TeacherAssignmentScope,
  type TeacherContext,
} from "@/lib/teacher-dashboard";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";
import { STAGE_CARD_CONFIG, STAGE_CARD_IMAGES } from "@/lib/stage-images";

type ClassCardEntry = {
  key: string;
  assignment: TeacherAssignmentScope;
};

function buildClassEntries(context: TeacherContext): ClassCardEntry[] {
  if (context.assignments.length > 0) {
    return context.assignments.map((assignment) => ({ key: assignment.id, assignment }));
  }
  if (context.isLeadTeacher) {
    return context.assignedGrades.map((grade) => ({
      key: `lead-${grade}`,
      assignment: {
        id: `lead-${grade}`,
        grade,
        section: null,
        islamic_group: null,
      },
    }));
  }
  return [];
}

type TeacherClassCardsProps = {
  context: TeacherContext;
  students: ScopedStudentRow[];
};

export function TeacherClassCards({ context, students }: TeacherClassCardsProps) {
  const { tr, trf, dir, lang } = useI18n();

  const entries = useMemo(() => buildClassEntries(context), [context]);

  return (
    <TeacherDashboardSection
      title={tr("teacher_my_classes")}
      action={
        <Link to="/teacher/classes" className="text-sm font-semibold text-primary hover:underline">
          {tr("view_all")}
        </Link>
      }
    >
      {entries.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">{tr("teacher_no_classes")}</p>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map(({ key, assignment }) => {
            const stageKey = gradeSlugToStageKey(assignment.grade);
            const stageConfig = STAGE_CARD_CONFIG[stageKey];
            const studentCount = students.filter((student) =>
              studentMatchesClassFilter(student, {
                grade: assignment.grade,
                section: assignment.section ?? "",
                islamic_group: assignment.islamic_group ?? "",
              }),
            ).length;
            const gradeLabel = gradeDisplayName(assignment.grade, lang);
            const sectionText = assignment.section
              ? sectionLabel(assignment.section, lang)
              : tr("teacher_all_sections");
            const groupText = assignment.islamic_group
              ? islamicGroupLabel(assignment.islamic_group, lang)
              : tr("teacher_all_groups");

            return (
              <article
                key={key}
                className="group relative min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]"
              >
                <div className="relative h-24 overflow-hidden sm:h-28">
                  <img
                    src={STAGE_CARD_IMAGES[stageKey]}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    style={{ objectPosition: stageConfig.objectPosition }}
                    loading="lazy"
                  />
                  <div className={`absolute inset-0 ${stageConfig.overlayClass}`} />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="font-display text-2xl font-semibold leading-none text-white sm:text-3xl">
                      {gradeLabel}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground">
                      {sectionText}
                    </span>
                    <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground">
                      {groupText}
                    </span>
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                      {trf("teacher_dash_student_count", { count: String(studentCount) })}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      to="/teacher/students"
                      search={{
                        grade: assignment.grade,
                        section: assignment.section ?? "",
                        islamic_group: assignment.islamic_group ?? "",
                      }}
                      className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-primary/90 sm:text-sm"
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="truncate">{tr("teacher_view_students")}</span>
                    </Link>
                    <Link
                      to="/teacher/performance"
                      className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50 sm:text-sm"
                    >
                      <ChartBar className="h-4 w-4 shrink-0" />
                      <span className="truncate">{tr("teacher_dash_view_performance")}</span>
                      <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${dir === "rtl" ? "rotate-180" : ""}`} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </TeacherDashboardSection>
  );
}
