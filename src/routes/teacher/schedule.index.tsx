import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/teacher/schedule/")({
  beforeLoad: () => {
    throw redirect({ to: "/teacher/timetable" });
  },
});
