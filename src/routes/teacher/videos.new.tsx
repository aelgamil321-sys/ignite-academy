import { createFileRoute } from "@tanstack/react-router";
import { TeacherVideosManager } from "@/components/teacher-cms-manager";

export const Route = createFileRoute("/teacher/videos/new")({
  component: () => <TeacherVideosManager mode="new" />,
});
