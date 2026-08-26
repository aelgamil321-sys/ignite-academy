import { createFileRoute } from "@tanstack/react-router";
import { TeacherArticlesManager } from "@/components/teacher-cms-manager";

export const Route = createFileRoute("/teacher/articles/")({
  component: () => (
    <TeacherArticlesManager mode="manage" titleKey="teacher_nav_manage_articles" />
  ),
});
