import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { AdminStudentDetailPage } from "@/routes/admin/students.$studentId";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/students/$studentId")({
  head: () => ({
    meta: [
      { title: "Student Detail — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherStudentDetailPage,
});

function LeadTeacherStudentDetailPage() {
  const { tr } = useI18n();
  return (
    <>
      <LeadTeacherPageHeader title={tr("admin_students_detail_title")} />
      <AdminStudentDetailPage />
    </>
  );
}
