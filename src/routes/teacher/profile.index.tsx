import { createFileRoute } from "@tanstack/react-router";
import { TeacherProfilePage } from "@/components/teacher-profile-page";

export const Route = createFileRoute("/teacher/profile/")({
  component: TeacherProfilePage,
});
