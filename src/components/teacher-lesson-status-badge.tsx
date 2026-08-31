import { useI18n } from "@/lib/i18n";

export function TeacherLessonStatusBadge({ published }: { published: boolean }) {
  const { tr } = useI18n();
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      {published ? tr("teacher_published") : tr("teacher_draft")}
    </span>
  );
}
