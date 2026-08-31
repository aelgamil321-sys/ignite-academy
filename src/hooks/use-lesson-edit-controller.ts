import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCMS, type CustomLesson } from "@/lib/cms";
import { lessonFromRow } from "@/lib/lesson-edit-row";

export type LessonEditAsyncPhase = "idle" | "loading" | "ready" | "error";

const INIT_TIMEOUT_MS = 15_000;
const isDev = import.meta.env.DEV;

type LogScope = "teacher-lesson-edit" | "admin-lesson-edit";

function logStage(scope: LogScope, stage: string, status: "start" | "end" | "error", extra?: Record<string, unknown>) {
  if (!isDev) return;
  console.info(`[${scope}] ${stage}_${status}`, extra ?? {});
}

export type UseLessonEditControllerOptions = {
  lessonId: string | null;
  /** Refresh CMS cache on mount (admin list sync) — never resyncs this lesson row. */
  refreshCmsOnMount?: boolean;
  logScope?: LogScope;
};

export function useLessonEditController({
  lessonId,
  refreshCmsOnMount = false,
  logScope = "teacher-lesson-edit",
}: UseLessonEditControllerOptions) {
  const { refresh } = useCMS();
  const [lesson, setLesson] = useState<CustomLesson | null>(null);
  const [phase, setPhase] = useState<LessonEditAsyncPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const initStartedRef = useRef<number | null>(null);

  useEffect(() => {
    if (refreshCmsOnMount) void refresh();
  }, [refresh, refreshCmsOnMount]);

  useEffect(() => {
    if (!lessonId) {
      setLesson(null);
      setPhase("ready");
      return;
    }

    let active = true;
    initStartedRef.current = performance.now();
    setPhase("loading");
    setError(null);
    setLesson(null);
    setTimedOut(false);

    const load = async () => {
      logStage(logScope, "lesson_fetch", "start");
      const t0 = performance.now();
      try {
        const { data, error: fetchError } = await supabase
          .from("lessons")
          .select("*")
          .eq("id", lessonId)
          .maybeSingle();
        if (!active) return;
        if (fetchError) throw fetchError;
        if (!data) {
          setLesson(null);
          setPhase("ready");
          logStage(logScope, "lesson_fetch", "end", { found: false, ms: Math.round(performance.now() - t0) });
          return;
        }
        setLesson(lessonFromRow(data as Record<string, unknown>));
        setPhase("ready");
        logStage(logScope, "lesson_fetch", "end", {
          found: true,
          ms: Math.round(performance.now() - t0),
          editorReadyMs:
            initStartedRef.current !== null
              ? Math.round(performance.now() - initStartedRef.current)
              : undefined,
        });
      } catch (e) {
        if (!active) return;
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        setPhase("error");
        logStage(logScope, "lesson_fetch", "error", { message });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [lessonId, retryKey, logScope]);

  useEffect(() => {
    if (!lessonId) return;
    if (phase !== "loading") {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), INIT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [lessonId, phase, retryKey]);

  const retry = useCallback(() => {
    setTimedOut(false);
    setLesson(null);
    setPhase("idle");
    setError(null);
    initStartedRef.current = null;
    setRetryKey((k) => k + 1);
  }, []);

  const handlePublishChange = useCallback((nextPublished: boolean) => {
    setLesson((current) => (current ? { ...current, published: nextPublished } : current));
  }, []);

  const refreshCms = useCallback(() => refresh(), [refresh]);

  return {
    lesson,
    phase,
    error,
    timedOut,
    retry,
    handlePublishChange,
    refreshCms,
    isLoading: phase === "loading",
    isNotFound: phase === "ready" && !lesson,
    isReady: phase === "ready" && lesson !== null,
    isError: phase === "error",
  };
}
