import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCMS, type CustomLesson } from "@/lib/cms";
import { useI18n } from "@/lib/i18n";

export function TeacherDeleteLessonButton({
  lesson,
  onDeleted,
}: {
  lesson: CustomLesson;
  onDeleted?: () => void;
}) {
  const { bi, tr } = useI18n();
  const { deleteLesson } = useCMS();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteLesson(lesson.id);
      toast.success(tr("teacher_lesson_deleted"));
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
        className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {tr("teacher_delete")}
      </button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tr("teacher_delete_lesson_title")}</AlertDialogTitle>
          <AlertDialogDescription>{tr("teacher_delete_lesson_confirm")}</AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-sm font-medium text-foreground">{bi(lesson.title)}</p>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{tr("teacher_cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              void confirmDelete();
            }}
          >
            {deleting ? tr("teacher_deleting") : tr("teacher_delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
