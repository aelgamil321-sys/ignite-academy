import { createFileRoute } from "@tanstack/react-router";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { Route as AdminAssignmentsRoute } from "@/routes/admin/assignments.index";
import { useI18n, L } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/assignments/")({
  head: () => ({
    meta: [
      { title: "Assignments — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherAssignmentsPage,
});

function LeadTeacherAssignmentsPage() {
  const { lang } = useI18n();
  const AssignmentsPage = AdminAssignmentsRoute.options.component;
  if (!AssignmentsPage) return null;
  return (
    <>
      <LeadTeacherPageHeader
        title={L("Assignments Management", "إدارة الواجبات")[lang]}
        lead={L(
          "Create assignments, review submissions, and grade student work.",
          "أنشئ الواجبات وراجع الإرسالات وقيّم أعمال الطلاب.",
        )[lang]}
      />
      <AssignmentsPage />
    </>
  );
}
