import { createFileRoute, notFound } from "@tanstack/react-router";
import { GradeDetailPanel } from "@/components/grade-detail-panel";
import { getGrade } from "@/lib/curriculum";

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
  notFoundComponent: () => <div className="text-sm text-muted-foreground">Grade not found.</div>,
});

function AdminGradePage() {
  const { grade } = Route.useLoaderData();
  return <GradeDetailPanel grade={grade} gradesBasePath="/admin/grades" />;
}
