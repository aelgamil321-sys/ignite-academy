import {
  ignitePregenerateLesson,
  igniteTranslateBatch,
  igniteVocabSuggest,
} from "@/lib/api/ai.functions";

export {
  collectLessonAiFields,
} from "@/lib/ai/lesson-ai-fields";

export type { VocabAiSuggestion, LessonAiField } from "@/lib/ai/ignite-ai.server";
export type {
  IgniteTranslateRequest,
  IgniteTranslateResponse,
  IgniteVocabSuggestRequest,
  IgnitePregenerateRequest,
} from "@/lib/ai/lesson-ai-fields";

export const AI_DISABLED_MESSAGE_AR =
  "خدمة الذكاء الاصطناعي غير مفعلة بعد. يرجى إضافة OPENAI_API_KEY في Cloudflare.";
export const AI_DISABLED_MESSAGE_EN =
  "AI service is not enabled yet. Please add OPENAI_API_KEY in Cloudflare.";

export class IgniteAiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "IgniteAiError";
  }
}

export function aiDisabledMessage(lang: "en" | "ar"): string {
  return lang === "ar" ? AI_DISABLED_MESSAGE_AR : AI_DISABLED_MESSAGE_EN;
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json");
}

async function readApiResponse<T>(res: Response, path: string): Promise<T> {
  if (!isJsonResponse(res)) {
    const preview = (await res.text()).slice(0, 160);
    console.error("[IgniteAI] Non-JSON response", { path, status: res.status, preview });
    throw new IgniteAiError(
      `AI endpoint returned invalid response (${res.status}). Check that /api/ignite is deployed on the server.`,
      res.status,
    );
  }

  const body = (await res.json()) as T & { error?: string; serviceAvailable?: boolean };
  if (!res.ok) {
    throw new IgniteAiError(body.error ?? `AI request failed (${res.status})`, res.status);
  }
  return body;
}

async function postIgniteApi<T>(path: string, payload: unknown): Promise<T | null> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    return await readApiResponse<T>(res, path);
  } catch (error) {
    if (error instanceof IgniteAiError) throw error;
    console.error("[IgniteAI] fetch failed", path, error);
    return null;
  }
}

async function callIgniteRpc<T>(
  apiPath: string,
  payload: unknown,
  serverCall: () => Promise<T>,
): Promise<T> {
  const fromApi = await postIgniteApi<T>(apiPath, payload);
  if (fromApi !== null) return fromApi;

  console.warn("[IgniteAI] API route unavailable, using server function fallback", apiPath);
  try {
    return await serverCall();
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed";
    console.error("[IgniteAI] server function failed", apiPath, error);
    throw new IgniteAiError(message);
  }
}

export type IgniteTranslateResponse = {
  translations: string[];
  serviceAvailable: boolean;
  fromCache?: boolean[];
  providers?: string[];
};

export async function callIgniteTranslate(
  payload: import("@/lib/ai/lesson-ai-fields").IgniteTranslateRequest,
): Promise<IgniteTranslateResponse> {
  return callIgniteRpc(
    "/api/ignite/translate",
    payload,
    () => igniteTranslateBatch({ data: payload }),
  );
}

export type VocabSuggestResponse = {
  suggestion: import("@/lib/ai/ignite-ai.server").VocabAiSuggestion | null;
  serviceAvailable: boolean;
  openAiConfigured?: boolean;
};

export async function callIgniteVocabSuggest(
  payload: import("@/lib/ai/lesson-ai-fields").IgniteVocabSuggestRequest,
): Promise<VocabSuggestResponse> {
  return callIgniteRpc(
    "/api/ignite/vocab-suggest",
    payload,
    () => igniteVocabSuggest({ data: payload }),
  );
}

export type PregenerateResponse = {
  generated: number;
  cached: number;
  skipped: number;
  serviceAvailable: boolean;
  openAiConfigured?: boolean;
  byLanguage: Record<string, number>;
};

export async function callIgnitePregenerateLesson(
  payload: import("@/lib/ai/lesson-ai-fields").IgnitePregenerateRequest,
): Promise<PregenerateResponse> {
  return callIgniteRpc(
    "/api/ignite/pregenerate-lesson",
    payload,
    () => ignitePregenerateLesson({ data: payload }),
  );
}

export type IgniteAiStatus = {
  serviceAvailable: boolean;
  openAiConfigured: boolean;
  translateApiConfigured: boolean;
};

export async function fetchIgniteAiStatus(): Promise<IgniteAiStatus> {
  const fromApi = await postIgniteApi<IgniteAiStatus>("/api/ignite/status", {});
  if (fromApi) return fromApi;
  return {
    serviceAvailable: false,
    openAiConfigured: false,
    translateApiConfigured: false,
  };
}
