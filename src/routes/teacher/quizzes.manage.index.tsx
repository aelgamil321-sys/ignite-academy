import { createFileRoute } from "@tanstack/react-router";
import { TeacherQuizzesManage } from "@/components/teacher-cms-manager";

export const Route = createFileRoute("/teacher/quizzes/manage/")({
  component: () => <TeacherQuizzesManage />,
});
