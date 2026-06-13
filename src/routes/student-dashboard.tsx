import { createFileRoute, redirect } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";

export const Route = createFileRoute("/student-dashboard")({
  beforeLoad: async () => {
    await blockParentFromStudentRoutes();
    throw redirect({ to: "/student" });
  },
  component: () => null,
});
