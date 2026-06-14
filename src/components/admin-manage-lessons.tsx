import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { grades } from "@/lib/curriculum";
import { useCMS, type CustomLesson } from "@/lib/cms";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const L = (en: string, ar: string) => ({ en, ar });

const DELETE_LESSON_CONFIRM = L(
  "Are you sure you want to delete this lesson?",
  "هل أنت متأكد أنك تريد حذف هذا الدرس؟",
);

export function DeleteLessonButton({
  lesson,
  lang,
  className,
  iconOnly,
  onDeleted,
}: {
  lesson: CustomLesson;
  lang: "en" | "ar";
  className?: string;
  iconOnly?: boolean;
  onDeleted?: () => void;
}) {
  const { deleteLesson } = useCMS();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteLesson(lesson.id);
      toast.success(L("Lesson deleted", "تم حذف الدرس")[locale]);
      setOpen(false);
      onDeleted?.();
    } catch {
      // CMS layer already shows the error toast
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"}
      >
        <Trash2 className="h-3.5 w-3.5" /> {!iconOnly && L("Delete", "حذف")[locale]}
      </button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{L("Delete lesson", "حذف الدرس")[locale]}</AlertDialogTitle>
          <AlertDialogDescription>{DELETE_LESSON_CONFIRM[locale]}</AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-sm font-medium text-foreground">{lesson.title[locale]}</p>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{L("Cancel", "إلغاء")[locale]}</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              void confirmDelete();
            }}
          >
            {deleting ? L("Deleting…", "جارٍ الحذف…")[locale] : L("Delete", "حذف")[locale]}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-xl text-foreground mb-4">{title}</h2>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Empty({ lang }: { lang: "en" | "ar" }) {
  return (
    <div className="text-sm text-muted-foreground py-6 text-center">
      {L("No items yet.", "لا توجد عناصر بعد.")[locale]}
    </div>
  );
}

export function AdminManageLessons() {
  const { lang } = useI18n();
  const { lessons, deletedLessons, restoreLesson } = useCMS();

  const handleRestore = async (l: CustomLesson) => {
    try {
      await restoreLesson(l.id);
      toast.success(L("Lesson restored", "تم استعادة الدرس")[locale]);
    } catch {
      // CMS layer already shows the error toast
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title={L("All Lessons", "جميع الدروس")[locale]}>
        {lessons.length === 0 ? (
          <Empty lang={lang} />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-start text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="text-start py-3 px-2">{L("Title", "العنوان")[locale]}</th>
                  <th className="text-start py-3 px-2">{L("Grade", "الصف")[locale]}</th>
                  <th className="text-start py-3 px-2">{L("Unit", "الوحدة")[locale]}</th>
                  <th className="text-start py-3 px-2">{L("Status", "الحالة")[locale]}</th>
                  <th className="text-end py-3 px-2">{L("Actions", "إجراءات")[locale]}</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 px-2">
                      <div className="font-medium text-foreground">{l.title[locale]}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                        {l.title[lang === "en" ? "ar" : "en"]}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                      {grades.find((g) => g.slug === l.grade)?.name[locale] ?? l.grade}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground truncate max-w-[140px]">
                      {l.unit[locale] || "—"}
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          l.published ? "border-primary text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        {l.published ? L("Published", "منشور")[locale] : L("Draft", "مسودة")[locale]}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to="/grades/$grade/$lesson"
                          params={{ grade: l.grade, lesson: l.id }}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary hover:text-primary"
                        >
                          <Eye className="h-3.5 w-3.5" /> {L("View", "عرض")[locale]}
                        </Link>
                        <Link
                          to="/admin/lessons/edit/$lessonId"
                          params={{ lessonId: l.id }}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" /> {L("Edit", "تعديل")[locale]}
                        </Link>
                        <DeleteLessonButton lesson={l} lang={lang} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title={L("Restore Deleted Lessons", "استعادة الدروس المحذوفة")[locale]}>
        {deletedLessons.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            {L("No deleted lessons.", "لا توجد دروس محذوفة.")[locale]}
          </div>
        ) : (
          <div className="space-y-2.5">
            {deletedLessons.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{l.title[locale]}</div>
                  <div className="text-xs text-muted-foreground">
                    {grades.find((g) => g.slug === l.grade)?.name[locale] ?? l.grade}
                    {l.unit[locale] ? ` · ${l.unit[locale]}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRestore(l)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-hover/10"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> {L("Restore", "استعادة")[locale]}
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
