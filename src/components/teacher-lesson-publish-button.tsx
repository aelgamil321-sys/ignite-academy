import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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

export function TeacherLessonPublishButton({
  lesson,
  published,
  onUpdated,
  compact = false,
}: {
  lesson: CustomLesson;
  published: boolean;
  onUpdated?: (nextPublished: boolean) => void;
  compact?: boolean;
}) {
  const { tr } = useI18n();
  const { updateLesson } = useCMS();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    setBusy(true);
    try {
      await updateLesson(lesson.id, { published: true });
      setConfirmOpen(false);
      onUpdated?.(true);
      toast.success(tr("teacher_lesson_published_success"));
    } catch {
      // CMS layer already shows the error toast
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    try {
      await updateLesson(lesson.id, { published: false });
      toast.success(tr("teacher_lesson_unpublished_success"));
      onUpdated?.(false);
    } catch {
      // CMS layer already shows the error toast
    } finally {
      setBusy(false);
    }
  };

  const buttonClass = compact
    ? "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
    : "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold disabled:opacity-60";

  if (published) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void unpublish()}
        className={`${buttonClass} border-border text-muted-foreground hover:border-primary hover:text-primary`}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
        {tr("teacher_unpublish")}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirmOpen(true)}
        className={`${buttonClass} border-primary bg-primary/10 text-primary hover:bg-primary/20`}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
        {tr("teacher_publish_to_students")}
      </button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("teacher_publish_to_students")}</AlertDialogTitle>
            <AlertDialogDescription>{tr("teacher_publish_lesson_confirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{tr("teacher_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                void publish();
              }}
            >
              {busy ? tr("teacher_loading") : tr("teacher_publish_to_students")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
