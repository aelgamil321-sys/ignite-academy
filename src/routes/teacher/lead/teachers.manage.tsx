import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { AdminTeacherManagement } from "@/components/admin-teacher-management";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/teachers/manage")({
  head: () => ({
    meta: [
      { title: "Manage Teachers — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherTeachersManagePage,
});

function LeadTeacherTeachersManagePage() {
  const { tr } = useI18n();
  return (
    <>
      <LeadTeacherPageHeader
        title={tr("admin_teachers_manage_title")}
        lead={tr("admin_teachers_manage_lead")}
      />
      <AdminTeacherManagement />
    </>
  );
}
