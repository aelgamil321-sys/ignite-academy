import { createFileRoute, Outlet } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";

export const Route = createFileRoute("/student")({
  beforeLoad: () => blockParentFromStudentRoutes(),
  component: () => <Outlet />,
});
