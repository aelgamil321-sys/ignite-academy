import { createFileRoute, notFound } from "@tanstack/react-router";
import { LessonPageBody } from "@/routes/grades.$grade.$lesson";
import { getGrade } from "@/lib/curriculum";
import { useI18n } from "@/lib/i18n";

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
  notFoundComponent: AdminLessonNotFound,
});

function AdminLessonNotFound() {
  const { tr } = useI18n();
  return <div className="text-sm text-muted-foreground">{tr("lesson_not_found")}</div>;
}

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
