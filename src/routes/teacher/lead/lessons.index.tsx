import { createFileRoute } from "@tanstack/react-router";
import { AdminManageLessons } from "@/components/admin-manage-lessons";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { useI18n, L } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/lessons/")({
  head: () => ({
    meta: [
      { title: "Manage Lessons — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherLessonsPage,
});

function LeadTeacherLessonsPage() {
  const { tr, lang } = useI18n();
  return (
    <>
      <LeadTeacherPageHeader
        title={L("Manage Lessons", "إدارة الدروس")[lang]}
        lead={L("View and edit all lessons.", "عرض وتعديل جميع الدروس.")[lang]}
      />
      <AdminManageLessons />
    </>
  );
}
