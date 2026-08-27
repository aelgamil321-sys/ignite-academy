import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/teacher/weekly-planning/$planId")({
  component: TeacherWeeklyPlanLayout,
});

function TeacherWeeklyPlanLayout() {
  return <Outlet />;
}
