import type {
  IgnitePregenerateRequest,
  IgniteTranslateRequest,
  IgniteTranslateResponse,
  IgniteVocabSuggestRequest,
} from "@/lib/ai/lesson-ai-fields";
import type { VocabAiSuggestion } from "@/lib/ai/ignite-ai.server";

export const AI_DISABLED_MESSAGE_AR = "خدمة الذكاء الاصطناعي غير مفعلة بعد.";
export const AI_DISABLED_MESSAGE_EN = "AI service is not enabled yet.";

export {
  collectLessonAiFields,
} from "@/lib/ai/lesson-ai-fields";

export type { VocabAiSuggestion, LessonAiField } from "@/lib/ai/ignite-ai.server";
export type {
  IgniteTranslateRequest,
  IgniteTranslateResponse,
  IgniteVocabSuggestRequest,
  IgnitePregenerateRequest,
};

async function postAiApi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `AI request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Client facade for cached server-side translation (no API keys in browser). */
export async function callIgniteTranslate(
  payload: IgniteTranslateRequest,
): Promise<IgniteTranslateResponse> {
  if (typeof window !== "undefined") {
    try {
      return await postAiApi<IgniteTranslateResponse>("/api/ignite/translate", payload);
    } catch {
      // fall through to server fn
    }
  }

  const { igniteTranslateBatch } = await import("@/lib/api/ai.functions");
  return igniteTranslateBatch({ data: payload });
}

export type VocabSuggestResponse = {
  suggestion: VocabAiSuggestion | null;
  serviceAvailable: boolean;
};

export async function callIgniteVocabSuggest(
  payload: IgniteVocabSuggestRequest,
): Promise<VocabSuggestResponse> {
  if (typeof window !== "undefined") {
    try {
      return await postAiApi<VocabSuggestResponse>("/api/ignite/vocab-suggest", payload);
    } catch {
      // fall through
    }
  }

  const { igniteVocabSuggest } = await import("@/lib/api/ai.functions");
  return igniteVocabSuggest({ data: payload });
}

export type PregenerateResponse = {
  generated: number;
  cached: number;
  skipped: number;
  serviceAvailable: boolean;
  byLanguage: Record<string, number>;
};

export async function callIgnitePregenerateLesson(
  payload: IgnitePregenerateRequest,
): Promise<PregenerateResponse> {
  if (typeof window !== "undefined") {
    try {
      return await postAiApi<PregenerateResponse>("/api/ignite/pregenerate-lesson", payload);
    } catch {
      // fall through
    }
  }

  const { ignitePregenerateLesson } = await import("@/lib/api/ai.functions");
  return ignitePregenerateLesson({ data: payload });
}

export function aiDisabledMessage(lang: "en" | "ar"): string {
  return lang === "ar" ? AI_DISABLED_MESSAGE_AR : AI_DISABLED_MESSAGE_EN;
}
