import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { AdminStudentsPage } from "@/routes/admin/students.index";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/students/")({
  head: () => ({
    meta: [
      { title: "Students — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherStudentsPage,
});

function LeadTeacherStudentsPage() {
  const { tr } = useI18n();
  return (
    <>
      <LeadTeacherPageHeader title={tr("admin_students_title")} lead={tr("admin_students_lead")} />
      <AdminStudentsPage />
    </>
  );
}
