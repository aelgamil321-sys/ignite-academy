import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/student-dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/student" });
  },
  component: () => null,
});
