import { createFileRoute } from "@tanstack/react-router";
import { TeacherCurriculumLinks } from "@/components/teacher-cms-manager";

export const Route = createFileRoute("/teacher/curriculum/")({
  component: () => <TeacherCurriculumLinks />,
});
