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
import { deleteAssignment, assignmentTitle, type AssignmentRow } from "@/lib/assignment";
import { useI18n } from "@/lib/i18n";

export function TeacherDeleteAssignmentButton({
  assignment,
  onDeleted,
}: {
  assignment: AssignmentRow;
  onDeleted?: () => void;
}) {
  const { bi, tr } = useI18n();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    const { error } = await deleteAssignment(assignment.id);
    setDeleting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(tr("teacher_assignment_deleted"));
    setOpen(false);
    onDeleted?.();
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
          <AlertDialogTitle>{tr("teacher_delete_assignment_title")}</AlertDialogTitle>
          <AlertDialogDescription>{tr("teacher_delete_assignment_confirm")}</AlertDialogDescription>
        </AlertDialogHeader>
        <p className="text-sm font-medium text-foreground">{bi(assignmentTitle(assignment))}</p>
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
