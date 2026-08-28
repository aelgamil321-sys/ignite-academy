import { createFileRoute, notFound } from "@tanstack/react-router";
import { LessonPageBody } from "@/routes/grades.$grade.$lesson";
import { getGrade } from "@/lib/curriculum";

export const Route = createFileRoute("/admin/grades/$grade/$lesson")({
  loader: ({ params }) => {
    const grade = getGrade(params.grade);
    if (!grade) throw notFound();
    return { gradeSlug: params.grade, lessonSlug: params.lesson };
  },
  head: () => ({
    meta: [
      { title: "Lesson — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminGradeLessonPage,
  notFoundComponent: () => <div className="text-sm text-muted-foreground">Lesson not found.</div>,
});

function AdminGradeLessonPage() {
  const { gradeSlug, lessonSlug } = Route.useLoaderData();
  return (
    <LessonPageBody
      gradeSlug={gradeSlug}
      lessonSlug={lessonSlug}
      gradesBasePath="/admin/grades"
      shell="admin"
    />
  );
}
