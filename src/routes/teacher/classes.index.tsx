import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  buildTeacherClassEntries,
  TeacherClassCard,
  TeacherClassCardGrid,
} from "@/components/teacher-class-card";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  fetchScopedStudents,
  fetchTeacherContext,
  type ScopedStudentRow,
  type TeacherContext,
} from "@/lib/teacher-dashboard";

export const Route = createFileRoute("/teacher/classes/")({
  component: TeacherClassesPage,
});

function TeacherClassesPage() {
  const { tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<TeacherContext | null>(null);
  const [students, setStudents] = useState<ScopedStudentRow[]>([]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const ctx = await fetchTeacherContext(data.user.id);
      const scopedStudents = await fetchScopedStudents();
      setContext(ctx);
      setStudents(scopedStudents);
      setLoading(false);
    })();
  }, []);

  const entries = useMemo(() => (context ? buildTeacherClassEntries(context) : []), [context]);

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
      {entries.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">{tr("teacher_no_classes")}</p>
      ) : (
        <TeacherClassCardGrid>
          {entries.map(({ key, assignment }) => (
            <TeacherClassCard key={key} assignment={assignment} students={students} />
          ))}
        </TeacherClassCardGrid>
      )}
    </div>
  );
}
