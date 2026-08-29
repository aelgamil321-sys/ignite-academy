import { createFileRoute } from "@tanstack/react-router";
import { TeacherQuizCreate } from "@/components/teacher-cms-manager";

export const Route = createFileRoute("/teacher/quizzes/new/")({
  component: () => <TeacherQuizCreate />,
});
