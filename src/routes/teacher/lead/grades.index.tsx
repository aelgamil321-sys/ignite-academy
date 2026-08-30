import { createFileRoute } from "@tanstack/react-router";
import { GradeCatalogPanel } from "@/components/grade-catalog-panel";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { adminGradesRouteSearch } from "@/routes/admin/grades.index";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/teacher/lead/grades/")({
  validateSearch: adminGradesRouteSearch,
  head: () => ({
    meta: [
      { title: "Grades — Lead Teacher" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadTeacherGradesPage,
});

function LeadTeacherGradesPage() {
  const { stage } = Route.useSearch();
  const { tr } = useI18n();
  return (
    <>
      <LeadTeacherPageHeader title={tr("all_stages")} lead={tr("stages_desc")} />
      <GradeCatalogPanel gradesBasePath="/teacher/lead/grades" stageFilter={stage} />
    </>
  );
}
