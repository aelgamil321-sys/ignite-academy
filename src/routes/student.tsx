import { createFileRoute, Link } from "@tanstack/react-router";
import { StudentGate, studentRouteHead } from "@/lib/student-layout";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";

export const Route = createFileRoute("/student")({
  beforeLoad: () => blockParentFromStudentRoutes(),
  head: studentRouteHead,
  component: StudentGate,
});
