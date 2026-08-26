import { createFileRoute } from "@tanstack/react-router";
import { TeacherArticlesManager } from "@/components/teacher-cms-manager";

export const Route = createFileRoute("/teacher/articles/new")({
  component: () => (
    <TeacherArticlesManager mode="new" titleKey="teacher_nav_add_article" defaultCategory="parent" />
  ),
});
