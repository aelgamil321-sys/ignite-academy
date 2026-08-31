import { grades } from "@/lib/curriculum";
import { LessonCreateDraftForm } from "@/components/lesson-create-draft-form";
import { useI18n, L } from "@/lib/i18n";

/** Admin Add Lesson — same simplified AI create flow as teacher, all grades. */
export function AdminNewLesson() {
  const { lang } = useI18n();

  return (
    <LessonCreateDraftForm
      allowedGradeSlugs={grades.map((g) => g.slug)}
      backTo="/admin/lessons"
      backLabel={L("Back to Manage Lessons", "العودة إلى إدارة الدروس")[lang]}
      editTo="/admin/lessons/edit/$lessonId"
      lockGradeWhenSingle={false}
    />
  );
}
