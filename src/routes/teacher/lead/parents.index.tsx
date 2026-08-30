import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { AdminParentsPage } from "@/routes/admin/parents.index";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/parents/")({
  head: () => ({
    meta: [
      { title: "Parents — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherParentsPage,
});

function LeadTeacherParentsPage() {
  const { tr } = useI18n();
  return (
    <>
      <LeadTeacherPageHeader
        title={tr("admin_home_parent_directory_title")}
        lead={tr("admin_home_parent_directory_lead")}
      />
      <AdminParentsPage />
    </>
  );
}
