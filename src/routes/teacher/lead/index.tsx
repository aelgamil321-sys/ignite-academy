import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherManagementOverview } from "@/components/lead-teacher-management-overview";
import { brandedTitle } from "@/lib/brand";

export const Route = createFileRoute("/teacher/lead/")({
  head: () => ({
    meta: [
      { title: brandedTitle("Lead Teacher Dashboard") },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherManagementOverview,
});
