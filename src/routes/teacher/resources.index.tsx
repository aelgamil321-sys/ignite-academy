import { createFileRoute } from "@tanstack/react-router";
import { TeacherResourcesManager } from "@/components/teacher-cms-manager";

export const Route = createFileRoute("/teacher/resources/")({
  component: () => <TeacherResourcesManager mode="manage" />,
});
