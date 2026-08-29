import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  buildTeacherClassEntries,
  TeacherClassCard,
  TeacherClassCardGrid,
} from "@/components/teacher-class-card";
import { TeacherDashboardSection } from "@/components/teacher-dashboard-section";
import { useI18n } from "@/lib/i18n";
import type { ScopedStudentRow, TeacherContext } from "@/lib/teacher-dashboard";

type TeacherClassCardsProps = {
  context: TeacherContext;
  students: ScopedStudentRow[];
};

export function TeacherClassCards({ context, students }: TeacherClassCardsProps) {
  const { tr } = useI18n();

  const entries = useMemo(() => buildTeacherClassEntries(context), [context]);

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
        <TeacherClassCardGrid>
          {entries.map(({ key, assignment }) => (
            <TeacherClassCard key={key} assignment={assignment} students={students} />
          ))}
        </TeacherClassCardGrid>
      )}
    </TeacherDashboardSection>
  );
}
