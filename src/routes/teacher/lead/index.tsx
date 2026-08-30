import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherManagementOverview } from "@/components/lead-teacher-management-overview";

export const Route = createFileRoute("/teacher/lead/")({
  head: () => ({
    meta: [
      { title: "Lead Teacher — Management Overview" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherManagementOverview,
});
