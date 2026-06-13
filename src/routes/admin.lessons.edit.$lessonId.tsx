import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LessonEditForm } from "@/components/lesson-edit-form";
import { normalizeQuizList } from "@/lib/lesson-quiz";
import { useCMS, type CustomLesson } from "@/lib/cms";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/lessons/edit/$lessonId")({
  head: () => ({
    meta: [
      { title: "Edit Lesson — Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLessonEditPage,
});

function AdminLessonEditPage() {
  const navigate = useNavigate();
  const { lessonId } = Route.useParams();
  const { lang } = useI18n();
  const { lessons, deletedLessons, loading, refresh } = useCMS();
  const [lesson, setLesson] = useState<CustomLesson | null>(null);
  const [fetching, setFetching] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const fromCms =
      lessons.find((l) => l.id === lessonId) ??
      deletedLessons.find((l) => l.id === lessonId);
    if (fromCms) {
      setLesson(fromCms);
      setFetching(false);
      return;
    }
    if (loading) return;

    let active = true;
    const load = async () => {
      setFetching(true);
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setLesson(null);
        setFetching(false);
        return;
      }
      const row = data as Record<string, unknown>;
      setLesson({
        id: String(row.id),
        grade: String(row.grade ?? ""),
        unit: parseBi(row.unit),
        title: parseBi(row.title),
        outcome: parseBi(row.outcome),
        explanation: parseBi(row.explanation),
        vocab: parseBi(row.vocab),
        activity: parseBi(row.activity),
        worksheetText: parseBi(row.worksheet_text),
        youtubeUrl: String(row.youtube_url ?? ""),
        youtubeArUrl: row.youtube_url_ar ? String(row.youtube_url_ar) : undefined,
        youtubeEnUrl: row.youtube_url_en ? String(row.youtube_url_en) : undefined,
        pdfUrl: row.pdf_url ? String(row.pdf_url) : undefined,
        pdfName: row.pdf_name ? String(row.pdf_name) : undefined,
        pptUrl: row.ppt_url ? String(row.ppt_url) : undefined,
        pptName: row.ppt_name ? String(row.ppt_name) : undefined,
        worksheetUrl: row.worksheet_url ? String(row.worksheet_url) : undefined,
        worksheetName: row.worksheet_name ? String(row.worksheet_name) : undefined,
        pptArUrl: row.ppt_ar_url ? String(row.ppt_ar_url) : undefined,
        pptEnUrl: row.ppt_en_url ? String(row.ppt_en_url) : undefined,
        worksheetArUrl: row.worksheet_ar_url ? String(row.worksheet_ar_url) : undefined,
        worksheetEnUrl: row.worksheet_en_url ? String(row.worksheet_en_url) : undefined,
        pdfArUrl: row.pdf_ar_url ? String(row.pdf_ar_url) : undefined,
        pdfEnUrl: row.pdf_en_url ? String(row.pdf_en_url) : undefined,
        quiz: normalizeQuizList(Array.isArray(row.quiz) ? row.quiz : []),
        subjectCategory: (row.subject_category as CustomLesson["subjectCategory"]) ?? "quran",
        published: Boolean(row.published),
        createdAt: new Date(String(row.created_at)).getTime(),
      });
      setFetching(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [lessonId, lessons, deletedLessons, loading]);

  const backToManage = () => {
    navigate({ to: "/admin/lessons" });
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <Link
        to="/admin/lessons"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {lang === "ar" ? "العودة إلى إدارة الدروس" : "Back to Manage Lessons"}
      </Link>

      <div className="rounded-xl border border-border bg-card p-4 text-xs font-mono space-y-1">
        <div className="font-sans text-sm font-semibold mb-2">Debug</div>
        <div>Current lesson id: <span className="text-primary break-all">{lessonId}</span></div>
        <div>Current user email: <span className="break-all">{email || "—"}</span></div>
      </div>

      {!lesson && (fetching || loading) ? (
        <div className="text-sm text-muted-foreground">
          {lang === "ar" ? "جارٍ تحميل الدرس…" : "Loading lesson…"}
        </div>
      ) : !lesson ? (
        <div className="text-sm text-destructive">
          {lang === "ar" ? "الدرس غير موجود." : "Lesson not found."}
        </div>
      ) : (
        <LessonEditForm
          key={lesson.id}
          lesson={lesson}
          onSaved={() => {
            void refresh();
            backToManage();
          }}
          onCancel={backToManage}
        />
      )}
    </div>
  );
}

function parseBi(raw: unknown): { en: string; ar: string } {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return { en: String(o.en ?? ""), ar: String(o.ar ?? "") };
  }
  return { en: "", ar: "" };
}
