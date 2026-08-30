import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { AdminTeacherDetailPage } from "@/routes/admin/teachers.$teacherId";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/teachers/$teacherId")({
  head: () => ({
    meta: [
      { title: "Teacher Detail — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherTeacherDetailPage,
});

function LeadTeacherTeacherDetailPage() {
  const { tr } = useI18n();
  return (
    <>
      <LeadTeacherPageHeader title={tr("admin_teachers_detail_title")} />
      <AdminTeacherDetailPage />
    </>
  );
}
