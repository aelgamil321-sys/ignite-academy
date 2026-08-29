import { createFileRoute } from "@tanstack/react-router";
import { TeacherReportsPage } from "@/components/teacher-reports-page";

export const Route = createFileRoute("/teacher/reports/")({
  component: TeacherReportsPage,
});
