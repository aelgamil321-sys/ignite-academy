import { createFileRoute } from "@tanstack/react-router";
import { TeacherTimetablePage } from "@/components/teacher-timetable-ui";

export const Route = createFileRoute("/teacher/timetable/")({
  component: () => <TeacherTimetablePage mode="add" />,
});
