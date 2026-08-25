import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { useCMS } from "@/lib/cms";
import { useI18n, L } from "@/lib/i18n";

export const Route = createFileRoute("/admin/lessons/")({
  head: () => ({
    meta: [
      { title: "Manage Lessons — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLessonsPage,
});

function AdminLessonsPage() {
  const { lessons, loading } = useCMS();
  const { lang, bi } = useI18n();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-foreground">Manage Lessons Page Loaded</h1>

      {loading ? (
        <p className="text-sm text-muted-foreground">{L("Loading lessons…", "جارٍ تحميل الدروس…")[lang]}</p>
      ) : lessons.length === 0 ? (
        <p className="text-sm text-muted-foreground">No lessons found.</p>
      ) : (
        <ul className="space-y-3">
          {lessons.map((lesson) => (
            <li
              key={lesson.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="font-medium text-foreground">{bi(lesson.title)}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {lesson.grade} · {bi(lesson.unit) || "—"}
                </div>
              </div>
              <Link
                to="/admin/lessons/edit/$lessonId"
                params={{ lessonId: lesson.id }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
