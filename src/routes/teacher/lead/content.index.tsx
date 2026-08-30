import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { AdminContentCenterPage } from "@/routes/admin/content.index";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/content/")({
  head: () => ({
    meta: [
      { title: "Content — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherContentPage,
});

function LeadTeacherContentPage() {
  const { tr } = useI18n();
  return (
    <>
      <LeadTeacherPageHeader title={tr("admin_content_title")} lead={tr("admin_content_lead")} />
      <AdminContentCenterPage />
    </>
  );
}
