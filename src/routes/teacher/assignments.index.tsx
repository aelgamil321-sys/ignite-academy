import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAllAssignmentsAdmin,
  assignmentTitle,
  type AssignmentRow,
} from "@/lib/assignment";
import { useI18n } from "@/lib/i18n";
import { TeacherDeleteAssignmentButton } from "@/components/teacher-delete-assignment-button";
import {
  TeacherAssignmentForm,
  useTeacherAssignmentContext,
} from "@/components/teacher-assignment-form";

export const Route = createFileRoute("/teacher/assignments/")({
  component: TeacherAssignmentsPage,
});

function TeacherAssignmentsPage() {
  const { bi, tr } = useI18n();
  const { context, loading: contextLoading } = useTeacherAssignmentContext();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AssignmentRow | null>(null);

  async function reloadAssignments() {
    const aRes = await fetchAllAssignmentsAdmin();
    if (aRes.error) toast.error(aRes.error);
    else setAssignments(aRes.data);
    setLoading(false);
  }

  useEffect(() => {
    void reloadAssignments();
  }, []);

  if (loading || contextLoading || !context) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_assignments")}</h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {tr("teacher_create_assignment")}
          </button>
        )}
      </div>

      {showForm && (
        <TeacherAssignmentForm
          context={context}
          editing={editing}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            void reloadAssignments();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      <ul className="space-y-3">
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{tr("teacher_no_assignments")}</p>
        ) : (
          assignments.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{bi(assignmentTitle(a))}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {a.grade} · {a.section ?? "—"} · {a.islamic_group ?? "—"}
                    {!a.published ? ` · ${tr("teacher_draft")}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(a);
                      setShowForm(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {tr("teacher_edit")}
                  </button>
                  <TeacherDeleteAssignmentButton assignment={a} onDeleted={() => void reloadAssignments()} />
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
