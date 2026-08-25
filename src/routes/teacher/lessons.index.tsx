import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCMS } from "@/lib/cms";
import { useI18n } from "@/lib/i18n";
import { normalizeGradeSlug } from "@/lib/grade-utils";
import { fetchTeacherContext } from "@/lib/teacher-dashboard";
import { TeacherDeleteLessonButton } from "@/components/teacher-delete-lesson-button";

export const Route = createFileRoute("/teacher/lessons/")({
  component: TeacherLessonsPage,
});

function TeacherLessonsPage() {
  const navigate = useNavigate();
  const { lessons, loading, refresh } = useCMS();
  const { bi, tr } = useI18n();
  const [assignedGrades, setAssignedGrades] = useState<string[]>([]);
  const [init, setInit] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newGrade, setNewGrade] = useState("");

  useEffect(() => {
    void refresh();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const ctx = await fetchTeacherContext(data.user.id);
      setAssignedGrades(ctx.assignedGrades);
      setNewGrade(ctx.assignedGrades[0] ?? "");
      setInit(false);
    })();
  }, [refresh]);

  const scopedLessons = useMemo(() => {
    if (assignedGrades.length === 0) return [];
    return lessons.filter((l) =>
      assignedGrades.includes(normalizeGradeSlug(l.grade) || l.grade),
    );
  }, [lessons, assignedGrades]);

  async function createLesson() {
    if (!newGrade) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("lessons")
        .insert({
          grade: newGrade,
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
      await refresh();
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

  if (loading || init) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {tr("teacher_loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-xl text-foreground">{tr("teacher_nav_lessons")}</h2>
        {assignedGrades.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
            >
              {assignedGrades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={creating}
              onClick={() => void createLesson()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {tr("teacher_new_lesson")}
            </button>
          </div>
        )}
      </div>
      {scopedLessons.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{tr("teacher_no_lessons")}</p>
      ) : (
        <ul className="space-y-3">
          {scopedLessons.map((lesson) => (
            <li
              key={lesson.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="font-medium text-foreground">{bi(lesson.title)}</div>
                <div className="text-xs text-muted-foreground">
                  {lesson.grade} · {bi(lesson.unit) || "—"}
                  {!lesson.published ? ` · ${tr("teacher_draft")}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/teacher/lessons/edit/$lessonId"
                  params={{ lessonId: lesson.id }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary hover:text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {tr("teacher_edit")}
                </Link>
                <TeacherDeleteLessonButton lesson={lesson} onDeleted={() => void refresh()} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
