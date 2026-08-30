import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LessonEditForm } from "@/components/lesson-edit-form";
import { parseVocabFromStorage } from "@/lib/lesson-vocab";
import { normalizeQuizList } from "@/lib/lesson-quiz";
import { useCMS, type CustomLesson } from "@/lib/cms";
import { useI18n, L } from "@/lib/i18n";
import { gradeMatches } from "@/lib/grade-utils";
import { fetchTeacherContext } from "@/lib/teacher-dashboard";
import { parseLocalizedText, type LocalizedText } from "@/lib/lesson-localized";
import { parseLessonUuid } from "@/lib/upload";
import type { Bi } from "@/lib/curriculum";

export const Route = createFileRoute("/teacher/lessons/edit/$lessonId")({
  component: TeacherLessonEditPage,
});

const INIT_TIMEOUT_MS = 15_000;
const isDev = import.meta.env.DEV;

type AsyncPhase = "idle" | "loading" | "ready" | "error";

function parseBi(raw: unknown): Bi {
  return parseLocalizedText(raw) as LocalizedText;
}

function lessonFromRow(row: Record<string, unknown>): CustomLesson {
  return {
    id: String(row.id),
    grade: String(row.grade ?? ""),
    unit: parseBi(row.unit),
    title: parseBi(row.title),
    outcome: parseBi(row.outcome),
    explanation: parseBi(row.explanation),
    vocab: parseVocabFromStorage(row.vocab),
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
  };
}

function logStage(stage: string, status: "start" | "end" | "error", extra?: Record<string, unknown>) {
  if (!isDev) return;
  console.info(`[teacher-lesson-edit] ${stage}_${status}`, extra ?? {});
}

function TeacherLessonEditPage() {
  const navigate = useNavigate();
  const { lessonId: rawLessonId } = Route.useParams();
  const lessonId = parseLessonUuid(rawLessonId);
  const { lang, tr } = useI18n();
  const { refresh } = useCMS();

  const [lesson, setLesson] = useState<CustomLesson | null>(null);
  const [lessonPhase, setLessonPhase] = useState<AsyncPhase>("idle");
  const [lessonError, setLessonError] = useState<string | null>(null);

  const [scopePhase, setScopePhase] = useState<AsyncPhase>("idle");
  const [scopeAllowed, setScopeAllowed] = useState(false);
  const [assignedGrades, setAssignedGrades] = useState<string[]>([]);
  const [scopeError, setScopeError] = useState<string | null>(null);

  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const timingsRef = useRef({
    lessonFetchMs: 0,
    scopeFetchMs: 0,
    editorReadyMs: 0,
  });
  const initStartedRef = useRef<number | null>(null);

  const retry = useCallback(() => {
    setTimedOut(false);
    setLesson(null);
    setLessonPhase("idle");
    setLessonError(null);
    setScopePhase("idle");
    setScopeAllowed(false);
    setAssignedGrades([]);
    setScopeError(null);
    timingsRef.current = { lessonFetchMs: 0, scopeFetchMs: 0, editorReadyMs: 0 };
    initStartedRef.current = null;
    setRetryKey((k) => k + 1);
  }, []);

  // Lesson fetch — direct by ID; never blocked on CMS bulk loading.
  useEffect(() => {
    if (!lessonId) {
      setLesson(null);
      setLessonPhase("ready");
      return;
    }

    let active = true;
    initStartedRef.current = performance.now();
    setLessonPhase("loading");
    setLessonError(null);
    setLesson(null);

    const load = async () => {
      logStage("lesson_fetch", "start");
      const t0 = performance.now();
      try {
        const { data, error } = await supabase
          .from("lessons")
          .select("*")
          .eq("id", lessonId)
          .maybeSingle();
        if (!active) return;
        if (error) throw error;
        if (!data) {
          setLesson(null);
          setLessonPhase("ready");
          logStage("lesson_fetch", "end", { found: false, ms: Math.round(performance.now() - t0) });
          return;
        }
        setLesson(lessonFromRow(data as Record<string, unknown>));
        setLessonPhase("ready");
        timingsRef.current.lessonFetchMs = Math.round(performance.now() - t0);
        logStage("lesson_fetch", "end", { found: true, ms: timingsRef.current.lessonFetchMs });
      } catch (e) {
        if (!active) return;
        const message = e instanceof Error ? e.message : String(e);
        setLessonError(message);
        setLessonPhase("error");
        logStage("lesson_fetch", "error", { message });
      }
    };

    void load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch on id/retry, not CMS cache churn
  }, [lessonId, retryKey]);

  // Teacher grade scope — keyed on lesson id/grade, not object identity.
  useEffect(() => {
    if (!lesson || lessonPhase !== "ready") {
      setScopePhase("idle");
      return;
    }

    let active = true;
    setScopePhase("loading");
    setScopeError(null);
    setScopeAllowed(false);

    const check = async () => {
      logStage("teacher_scope", "start");
      const t0 = performance.now();
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (!active) return;
        if (authError) throw authError;
        if (!data.user) {
          setScopeAllowed(false);
          setScopePhase("ready");
          logStage("teacher_scope", "end", { allowed: false, reason: "no_user" });
          return;
        }

        logStage("grade_scope", "start");
        const ctx = await fetchTeacherContext(data.user.id);
        if (!active) return;
        const allowed = ctx.assignedGrades.some((assigned) => gradeMatches(lesson.grade, assigned));
        setAssignedGrades(ctx.assignedGrades);
        setScopeAllowed(allowed);
        setScopePhase("ready");
        timingsRef.current.scopeFetchMs = Math.round(performance.now() - t0);
        logStage("grade_scope", "end", { allowed, ms: timingsRef.current.scopeFetchMs });
        logStage("teacher_scope", "end", { allowed });

        if (initStartedRef.current !== null) {
          timingsRef.current.editorReadyMs = Math.round(performance.now() - initStartedRef.current);
          logStage("render_ready", "end", { ms: timingsRef.current.editorReadyMs });
        }
      } catch (e) {
        if (!active) return;
        const message = e instanceof Error ? e.message : String(e);
        setScopeError(message);
        setScopePhase("error");
        logStage("teacher_scope", "error", { message });
      }
    };

    void check();
    return () => {
      active = false;
    };
  }, [lesson?.id, lesson?.grade, lessonPhase, retryKey]);

  // UX fail-safe — never spin forever.
  useEffect(() => {
    if (!lessonId) return;
    const stillLoading =
      lessonPhase === "loading" ||
      (lesson && lessonPhase === "ready" && scopePhase === "loading");
    if (!stillLoading) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), INIT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [lessonId, lesson, lessonPhase, scopePhase, retryKey]);

  const back = () => navigate({ to: "/teacher/lessons" });
  const loadFailedMessage = L(
    "Could not load lesson data. Try again.",
    "تعذر تحميل بيانات الدرس. حاول مرة أخرى.",
  )[lang];

  if (!lessonId) {
    return <div className="text-sm text-destructive">{tr("teacher_lesson_not_found")}</div>;
  }

  if (timedOut) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-destructive">{loadFailedMessage}</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted"
        >
          {L("Try again", "حاول مرة أخرى")[lang]}
        </button>
      </div>
    );
  }

  if (lessonPhase === "loading" || (lesson && lessonPhase === "ready" && scopePhase === "loading")) {
    return <div className="text-sm text-muted-foreground">{tr("teacher_loading")}</div>;
  }

  if (lessonPhase === "error") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-destructive">{lessonError ?? loadFailedMessage}</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted"
        >
          {L("Try again", "حاول مرة أخرى")[lang]}
        </button>
      </div>
    );
  }

  if (!lesson) {
    return <div className="text-sm text-destructive">{tr("teacher_lesson_not_found")}</div>;
  }

  if (scopePhase === "error") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-destructive">{scopeError ?? loadFailedMessage}</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted"
        >
          {L("Try again", "حاول مرة أخرى")[lang]}
        </button>
      </div>
    );
  }

  if (!scopeAllowed) {
    return <div className="text-sm text-destructive">{tr("teacher_lesson_out_of_scope")}</div>;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <Link
        to="/teacher/lessons"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
        {tr("teacher_back_lessons")}
      </Link>
      <LessonEditForm
        key={lesson.id}
        lesson={lesson}
        formMode="simplified"
        allowedGrades={assignedGrades}
        onSaved={() => {
          void refresh();
          back();
        }}
        onCancel={back}
      />
    </div>
  );
}
