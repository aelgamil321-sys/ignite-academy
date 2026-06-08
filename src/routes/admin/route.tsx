import { createFileRoute } from "@tanstack/react-router";
import { AdminGate, adminRouteHead, adminRouteSearch } from "../admin";

export const Route = createFileRoute("/admin")({
  validateSearch: adminRouteSearch,
  head: adminRouteHead,
  component: AdminGate,
});
