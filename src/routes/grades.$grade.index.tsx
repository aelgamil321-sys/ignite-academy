import { createFileRoute, notFound } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import { enforceStudentOwnGradeInUrl } from "@/lib/student-route-guard";
import { StudentOrPublicSiteLayout } from "@/components/student-or-public-site-layout";
import { GradeDetailPanel } from "@/components/grade-detail-panel";
import { getGrade } from "@/lib/curriculum";
import { studentGradeSearch } from "@/lib/student-grade-nav";
import { useI18n } from "@/lib/i18n";

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
    return {
      meta: [
        { title: `${name} Islamic Studies — Ignite Islamic Academy` },
        { name: "description", content: `Islamic Studies lessons, worksheets, videos and quizzes for ${name} students at Ignite Islamic Academy.` },
        { property: "og:title", content: `${name} Islamic Studies — Ignite Islamic Academy` },
        { property: "og:description", content: `Lessons, worksheets, videos and quizzes for ${name}.` },
        { property: "og:url", content: `https://ignite-faith-learn.lovable.app/grades/${params.grade}` },
      ],
      links: [{ rel: "canonical", href: `https://ignite-faith-learn.lovable.app/grades/${params.grade}` }],
    };
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
