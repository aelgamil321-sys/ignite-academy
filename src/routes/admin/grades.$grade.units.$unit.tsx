import { createFileRoute, notFound } from "@tanstack/react-router";
import { UnitPage } from "@/routes/grades.$grade.units.$unit";
import { getGrade } from "@/lib/curriculum";

export const Route = createFileRoute("/admin/grades/$grade/units/$unit")({
  loader: ({ params }) => {
    const grade = getGrade(params.grade);
    if (!grade) throw notFound();
    return { grade, unitSlug: params.unit };
  },
  head: () => ({
    meta: [
      { title: "Unit — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminGradeUnitPage,
  notFoundComponent: () => <div className="text-sm text-muted-foreground">Unit not found.</div>,
});

function AdminGradeUnitPage() {
  const { grade, unitSlug } = Route.useLoaderData();
  return <UnitPage grade={grade} unitSlug={unitSlug} gradesBasePath="/admin/grades" />;
}
