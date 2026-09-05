import { Link } from "@tanstack/react-router";
import { ChartBar, Users } from "lucide-react";
import { gradeDisplayName } from "@/lib/grade-utils";
import { useI18n } from "@/lib/i18n";
import { islamicGroupLabel, sectionLabel } from "@/lib/student-academics";
import { STAGE_CARD_IMAGES } from "@/lib/stage-images";
import { gradeSlugToStageKey } from "@/lib/teacher-homepage";
import {
  studentMatchesClassFilter,
  type ScopedStudentRow,
  type TeacherAssignmentScope,
  type TeacherContext,
} from "@/lib/teacher-dashboard";
import {
  DEFAULT_TEACHING_SUBJECT,
  teachingSubjectBadgeClass,
  teachingSubjectLabel,
  type TeachingSubjectType,
} from "@/lib/teacher-assignment-subject";

export type TeacherClassCardEntry = {
  key: string;
  assignment: TeacherAssignmentScope;
};

export function buildTeacherClassEntries(context: TeacherContext): TeacherClassCardEntry[] {
  if (context.assignments.length > 0) {
    return context.assignments.map((assignment) => ({ key: assignment.id, assignment }));
  }
  if (context.isLeadTeacher) {
    return context.assignedGrades.map((grade) => ({
      key: `lead-${grade}`,
      assignment: {
        id: `lead-${grade}`,
        subject_type: DEFAULT_TEACHING_SUBJECT,
        grade,
        section: null,
        islamic_group: null,
      },
    }));
  }
  return [];
}

export function TeacherClassCardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

type TeacherClassCardProps = {
  assignment: TeacherAssignmentScope;
  students: ScopedStudentRow[];
};

/** Teacher-only focal point — keeps subject visible in the small thumbnail crop. */
const TEACHER_CARD_IMAGE_POSITION = "center 35%";

export function TeacherClassCard({ assignment, students }: TeacherClassCardProps) {
  const { tr, trf, lang } = useI18n();

  const stageKey = gradeSlugToStageKey(assignment.grade);
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

  const subjectLabel = teachingSubjectLabel(assignment.subject_type, lang);

  const chipClass =
    "inline-flex min-h-7 items-center rounded-md border px-2 py-1 text-xs font-medium leading-none";

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] md:min-h-[220px] md:flex-row">
      {/* Mobile: image on top. Desktop: image on the trailing side (left in RTL, right in LTR). */}
      <div className="order-1 shrink-0 px-4 pt-4 md:order-2 md:flex md:w-[200px] md:max-w-[40%] md:flex-none md:items-center md:px-4 md:py-4 md:ps-0">
        <div className="h-[150px] w-full overflow-hidden rounded-xl md:h-[140px]">
          <img
            src={STAGE_CARD_IMAGES[stageKey]}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            style={{ objectPosition: TEACHER_CARD_IMAGE_POSITION }}
            loading="lazy"
          />
        </div>
      </div>

      <div className="order-2 flex min-w-0 flex-1 flex-col justify-between gap-3 p-4 md:order-1 md:py-4 md:pe-3">
        <div className="min-w-0 space-y-2">
          <h3 className="line-clamp-2 font-display text-lg font-semibold leading-snug text-foreground">
            {gradeLabel}
          </h3>
          <div className="flex flex-wrap gap-2">
            <span
              className={`${chipClass} ${teachingSubjectBadgeClass(assignment.subject_type)}`}
            >
              {subjectLabel}
            </span>
            <span className={`${chipClass} border-border bg-muted/50 text-foreground`}>
              {sectionText}
            </span>
            <span className={`${chipClass} border-primary/25 bg-primary/10 text-foreground`}>
              {groupText}
            </span>
            <span className={`${chipClass} border-border bg-background text-muted-foreground`}>
              {trf("teacher_dash_student_count", { count: String(studentCount) })}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-2">
          <Link
            to="/teacher/students"
            search={{
              grade: assignment.grade,
              section: assignment.section ?? "",
              islamic_group: assignment.islamic_group ?? "",
              subject_type: assignment.subject_type,
            }}
            className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-primary/90"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="truncate">{tr("teacher_view_students")}</span>
          </Link>
          <Link
            to="/teacher/performance"
            search={{
              grade: assignment.grade,
              section: assignment.section ?? "",
              islamic_group: assignment.islamic_group ?? "",
              subject_type: assignment.subject_type,
            }}
            className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
          >
            <ChartBar className="h-4 w-4 shrink-0" />
            <span className="truncate">{tr("teacher_dash_view_performance")}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
