import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { AdminTeacherDirectoryPage } from "@/routes/admin/teachers.index";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/teachers/")({
  head: () => ({
    meta: [
      { title: "Teachers — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherTeachersPage,
});

function LeadTeacherTeachersPage() {
  const { tr } = useI18n();
  return (
    <>
      <LeadTeacherPageHeader title={tr("admin_teachers_title")} lead={tr("admin_teachers_lead")} />
      <AdminTeacherDirectoryPage />
    </>
  );
}
