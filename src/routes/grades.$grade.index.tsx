import { createFileRoute, notFound } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import { enforceStudentOwnGradeInUrl } from "@/lib/student-route-guard";
import { StudentOrPublicSiteLayout } from "@/components/student-or-public-site-layout";
import { GradeDetailPanel } from "@/components/grade-detail-panel";
import { getGrade } from "@/lib/curriculum";
import { studentGradeSearch } from "@/lib/student-grade-nav";
import { useI18n } from "@/lib/i18n";
import { publicPageHead } from "@/lib/seo";

export const Route = createFileRoute("/grades/$grade/")({
  validateSearch: studentGradeSearch,
  beforeLoad: async ({ params }) => {
    await blockParentFromStudentRoutes();
    await enforceStudentOwnGradeInUrl(params.grade);
  },
  loader: ({ params }) => {
    const grade = getGrade(params.grade);
    if (!grade) throw notFound();
    return { grade };
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.grade.name.en ?? "Grade";
    return publicPageHead({
      title: `${name} Islamic Studies — Ignite Islamic Academy`,
      description: `Islamic Studies lessons, worksheets, videos and quizzes for ${name} students at Ignite Islamic Academy.`,
      path: `/grades/${params.grade}`,
      ogTitle: `${name} Islamic Studies — Ignite Islamic Academy`,
      ogDescription: `Lessons, worksheets, videos and quizzes for ${name}.`,
    });
  },
  component: GradePage,
  notFoundComponent: GradeNotFound,
  errorComponent: ({ error }) => <div className="container-page py-20">Error: {error.message}</div>,
});

function GradeNotFound() {
  const { tr } = useI18n();
  return <div className="container-page py-20">{tr("grade_not_found")}</div>;
}

function GradePage() {
  const { grade } = Route.useLoaderData();
  const { view } = Route.useSearch();

  return (
    <StudentOrPublicSiteLayout>
      <GradeDetailPanel grade={grade} gradesBasePath="/grades" view={view} />
    </StudentOrPublicSiteLayout>
  );
}
