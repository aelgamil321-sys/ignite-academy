import { createFileRoute, notFound } from "@tanstack/react-router";
import { GradeDetailPanel } from "@/components/grade-detail-panel";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { getGrade } from "@/lib/curriculum";

export const Route = createFileRoute("/teacher/lead/grades/$grade/")({
  loader: ({ params }) => {
    const grade = getGrade(params.grade);
    if (!grade) throw notFound();
    return { grade };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.grade.name.en ?? "Grade";
    return {
      meta: [
        { title: `${name} — Lead Teacher` },
        { name: "robots", content: "noindex,nofollow" },
      ],
    };
  },
  component: LeadTeacherGradeDetailPage,
  notFoundComponent: () => <div className="text-sm text-muted-foreground">Grade not found.</div>,
});

function LeadTeacherGradeDetailPage() {
  const { grade } = Route.useLoaderData();
  return (
    <>
      <LeadTeacherPageHeader title={grade.name.en} />
      <GradeDetailPanel grade={grade} gradesBasePath="/teacher/lead/grades" />
    </>
  );
}
