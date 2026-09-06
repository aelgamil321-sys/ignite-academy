import { createFileRoute, notFound } from "@tanstack/react-router";
import { GradeDetailPanel } from "@/components/grade-detail-panel";
import { getGrade } from "@/lib/curriculum";
import { useSchoolManagementPaths } from "@/lib/workspace-paths";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/grades/$grade/")({
  loader: ({ params }) => {
    const grade = getGrade(params.grade);
    if (!grade) throw notFound();
    return { grade };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.grade.name.en ?? "Grade";
    return {
      meta: [
        { title: `${name} — Admin` },
        { name: "robots", content: "noindex,nofollow" },
      ],
    };
  },
  component: AdminGradePage,
  notFoundComponent: AdminGradeNotFound,
});

function AdminGradeNotFound() {
  const { tr } = useI18n();
  return <div className="text-sm text-muted-foreground">{tr("grade_not_found")}</div>;
}

function AdminGradePage() {
  const { grade } = Route.useLoaderData();
  const paths = useSchoolManagementPaths();
  return <GradeDetailPanel grade={grade} gradesBasePath={paths.grades} />;
}
