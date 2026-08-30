import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireLeadTeacherAccess } from "@/lib/school-management-access";

export const Route = createFileRoute("/teacher/lead")({
  beforeLoad: () => requireLeadTeacherAccess(),
  component: () => <Outlet />,
});
