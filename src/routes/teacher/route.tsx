import { createFileRoute } from "@tanstack/react-router";
import { TeacherGate, teacherRouteHead } from "@/lib/teacher-layout";
import { requireTeacherRole } from "@/lib/teacher-route-guard";

export const Route = createFileRoute("/teacher")({
  beforeLoad: () => requireTeacherRole(),
  head: teacherRouteHead,
  component: TeacherGate,
});
