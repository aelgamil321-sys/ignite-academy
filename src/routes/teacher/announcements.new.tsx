import { createFileRoute } from "@tanstack/react-router";
import { TeacherArticlesManager } from "@/components/teacher-cms-manager";

export const Route = createFileRoute("/teacher/announcements/new")({
  component: () => (
    <TeacherArticlesManager
      mode="new"
      titleKey="teacher_nav_add_announcement"
      categoryFilter="announcement"
      defaultCategory="announcement"
    />
  ),
});
