import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  fetchTeacherContext,
  formatClassScopeLabel,
  type TeacherAssignmentScope,
} from "@/lib/teacher-dashboard";

export const Route = createFileRoute("/teacher/classes/")({
  component: TeacherClassesPage,
});

function TeacherClassesPage() {
  const { lang, tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<TeacherAssignmentScope[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const ctx = await fetchTeacherContext(data.user.id);
      setAssignments(ctx.assignments);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl text-foreground">{tr("teacher_my_classes")}</h2>
      {assignments.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("teacher_no_classes")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {assignments.map((a) => (
            <li key={a.id}>
              <Link
                to="/teacher/students"
                search={{
                  grade: a.grade,
                  section: a.section ?? "",
                  islamic_group: a.islamic_group ?? "",
                }}
                className="block rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] hover:border-primary/40"
              >
                <p className="font-semibold text-foreground">{formatClassScopeLabel(a, lang)}</p>
                <p className="mt-1 text-xs text-primary">{tr("teacher_view_students")}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
