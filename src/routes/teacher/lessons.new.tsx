import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { fetchTeacherContext } from "@/lib/teacher-dashboard";

export const Route = createFileRoute("/teacher/lessons/new")({
  component: TeacherNewLessonPage,
});

function TeacherNewLessonPage() {
  const navigate = useNavigate();
  const { tr } = useI18n();
  const [grades, setGrades] = useState<string[]>([]);
  const [grade, setGrade] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const ctx = await fetchTeacherContext(data.user.id);
      setGrades(ctx.assignedGrades);
      setGrade(ctx.assignedGrades[0] ?? "");
    })();
  }, []);

  async function createLesson() {
    if (!grade) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("lessons")
        .insert({
          grade,
          title: { en: "New lesson", ar: "درس جديد" },
          unit: { en: "", ar: "" },
          outcome: { en: "", ar: "" },
          explanation: { en: "", ar: "" },
          vocab: [],
          quiz: [],
          subject_category: "quran",
          published: false,
        })
        .select("id")
        .single();
      if (error) throw error;
      navigate({
        to: "/teacher/lessons/edit/$lessonId",
        params: { lessonId: String(data.id) },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_add_lesson")}</h2>
      <label className="block text-sm">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{tr("teacher_field_grade")}</span>
        <select
          className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
        >
          {grades.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </label>
      <button
        type="button"
        disabled={creating || !grade}
        onClick={() => void createLesson()}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {tr("teacher_new_lesson")}
      </button>
    </div>
  );
}
