import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "../admin";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});
