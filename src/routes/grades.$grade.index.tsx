import { createFileRoute, notFound } from "@tanstack/react-router";
import { blockParentFromStudentRoutes } from "@/lib/parent-route-guard";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AskMrAhmed } from "@/components/ask-mr-ahmed";
import { GradeDetailPanel } from "@/components/grade-detail-panel";
import { getGrade } from "@/lib/curriculum";

export const Route = createFileRoute("/grades/$grade/")({
  beforeLoad: () => blockParentFromStudentRoutes(),
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
  notFoundComponent: () => <div className="container-page py-20">Grade not found.</div>,
  errorComponent: ({ error }) => <div className="container-page py-20">Error: {error.message}</div>,
});

function GradePage() {
  const { grade } = Route.useLoaderData();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 container-page">
        <GradeDetailPanel grade={grade} gradesBasePath="/grades" />
      </main>
      <SiteFooter />
      <AskMrAhmed />
    </div>
  );
}
