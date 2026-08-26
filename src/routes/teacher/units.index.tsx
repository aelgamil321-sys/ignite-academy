import { createFileRoute } from "@tanstack/react-router";
import { TeacherUnitsManager } from "@/components/teacher-cms-manager";

export const Route = createFileRoute("/teacher/units/")({
  component: () => <TeacherUnitsManager />,
});
