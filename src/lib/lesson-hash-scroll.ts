import { useEffect } from "react";

const LESSON_SECTION_IDS = new Set([
  "lesson-video",
  "lesson-pdf",
  "lesson-worksheet",
  "lesson-quiz",
  "lesson-result",
]);

export function scrollToLessonSection(hash: string, behavior: ScrollBehavior = "smooth") {
  const id = hash.replace(/^#/, "");
  if (!LESSON_SECTION_IDS.has(id)) return false;

  const el = document.getElementById(id);
  if (!el) return false;

  el.scrollIntoView({ behavior, block: "start" });
  if (!el.hasAttribute("tabindex")) {
    el.setAttribute("tabindex", "-1");
  }
  el.focus({ preventScroll: true });
  return true;
}

/** Smooth-scroll to `location.hash` after lesson content mounts (retries while quiz loads). */
export function useLessonHashScroll(ready: boolean, lessonKey?: string) {
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash) return;

    let attempts = 0;
    const maxAttempts = 12;
    let timeoutId: number | undefined;

    const tryScroll = () => {
      if (scrollToLessonSection(hash)) return;
      attempts += 1;
      if (attempts < maxAttempts) {
        timeoutId = window.setTimeout(tryScroll, 150);
      }
    };

    const frame = window.requestAnimationFrame(tryScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [ready, lessonKey]);
}
