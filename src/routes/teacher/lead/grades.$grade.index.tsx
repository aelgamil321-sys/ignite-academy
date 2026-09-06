import { createFileRoute, notFound } from "@tanstack/react-router";
import { GradeDetailPanel } from "@/components/grade-detail-panel";
import { LeadTeacherPageHeader } from "@/components/lead-teacher-page-header";
import { getGrade } from "@/lib/curriculum";
import { useI18n } from "@/lib/i18n";

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
  notFoundComponent: LeadGradeNotFound,
});

function LeadGradeNotFound() {
  const { tr } = useI18n();
  return <div className="text-sm text-muted-foreground">{tr("grade_not_found")}</div>;
}

function LeadTeacherGradeDetailPage() {
  const { grade } = Route.useLoaderData();
  return (
    <>
      <LeadTeacherPageHeader title={grade.name.en} />
      <GradeDetailPanel grade={grade} gradesBasePath="/teacher/lead/grades" />
    </>
  );
}
