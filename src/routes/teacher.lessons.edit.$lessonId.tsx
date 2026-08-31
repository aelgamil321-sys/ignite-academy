import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LessonEditForm } from "@/components/lesson-edit-form";
import { useI18n, L } from "@/lib/i18n";
import { gradeMatches } from "@/lib/grade-utils";
import { fetchTeacherContext } from "@/lib/teacher-dashboard";
import { parseLessonUuid } from "@/lib/upload";
import { useLessonEditController } from "@/hooks/use-lesson-edit-controller";

export const Route = createFileRoute("/teacher/lessons/edit/$lessonId")({
  component: TeacherLessonEditPage,
});

const INIT_TIMEOUT_MS = 15_000;
const isDev = import.meta.env.DEV;

type AsyncPhase = "idle" | "loading" | "ready" | "error";

function logStage(stage: string, status: "start" | "end" | "error", extra?: Record<string, unknown>) {
  if (!isDev) return;
  console.info(`[teacher-lesson-edit] ${stage}_${status}`, extra ?? {});
}

function TeacherLessonEditPage() {
  const navigate = useNavigate();
  const { lessonId: rawLessonId } = Route.useParams();
  const lessonId = parseLessonUuid(rawLessonId);
  const { lang, tr } = useI18n();

  const {
    lesson,
    error: lessonError,
    timedOut,
    retry,
    refreshCms,
    isLoading: lessonLoading,
    isNotFound,
    isError: lessonLoadError,
    isReady: lessonReady,
    phase: lessonPhase,
  } = useLessonEditController({
    lessonId,
    logScope: "teacher-lesson-edit",
  });

  const [scopePhase, setScopePhase] = useState<AsyncPhase>("idle");
  const [scopeAllowed, setScopeAllowed] = useState(false);
  const [assignedGrades, setAssignedGrades] = useState<string[]>([]);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [scopeTimedOut, setScopeTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const timingsRef = useRef({ scopeFetchMs: 0 });

  const retryAll = () => {
    setScopeTimedOut(false);
    setScopePhase("idle");
    setScopeAllowed(false);
    setAssignedGrades([]);
    setScopeError(null);
    timingsRef.current = { scopeFetchMs: 0 };
    setRetryKey((k) => k + 1);
    retry();
  };

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

  useEffect(() => {
    if (!lessonId) return;
    const stillLoading =
      lessonLoading || (lesson && lessonPhase === "ready" && scopePhase === "loading");
    if (!stillLoading) {
      setScopeTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setScopeTimedOut(true), INIT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [lessonId, lesson, lessonPhase, lessonLoading, scopePhase, retryKey]);

  const back = () => navigate({ to: "/teacher/lessons" });
  const loadFailedMessage = L(
    "Could not load lesson data. Try again.",
    "تعذر تحميل بيانات الدرس. حاول مرة أخرى.",
  )[lang];

  if (!lessonId) {
    return <div className="text-sm text-destructive">{tr("teacher_lesson_not_found")}</div>;
  }

  if (timedOut || scopeTimedOut) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-destructive">{loadFailedMessage}</p>
        <button
          type="button"
          onClick={retryAll}
          className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted"
        >
          {L("Try again", "حاول مرة أخرى")[lang]}
        </button>
      </div>
    );
  }

  if (lessonLoading || (lesson && lessonPhase === "ready" && scopePhase === "loading")) {
    return <div className="text-sm text-muted-foreground">{tr("teacher_loading")}</div>;
  }

  if (lessonLoadError) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-destructive">{lessonError ?? loadFailedMessage}</p>
        <button
          type="button"
          onClick={retryAll}
          className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted"
        >
          {L("Try again", "حاول مرة أخرى")[lang]}
        </button>
      </div>
    );
  }

  if (isNotFound) {
    return <div className="text-sm text-destructive">{tr("teacher_lesson_not_found")}</div>;
  }

  if (scopePhase === "error") {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-destructive">{scopeError ?? loadFailedMessage}</p>
        <button
          type="button"
          onClick={retryAll}
          className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-muted"
        >
          {L("Try again", "حاول مرة أخرى")[lang]}
        </button>
      </div>
    );
  }

  if (!scopeAllowed || !lessonReady || !lesson) {
    if (lessonReady && lesson && scopePhase === "ready" && !scopeAllowed) {
      return <div className="text-sm text-destructive">{tr("teacher_lesson_out_of_scope")}</div>;
    }
    return <div className="text-sm text-muted-foreground">{tr("teacher_loading")}</div>;
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
          void refreshCms();
          back();
        }}
        onCancel={back}
      />
    </div>
  );
}
