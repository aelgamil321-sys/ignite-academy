import type { LessonGenerationProviderDiagnostic } from "@/lib/ai/openai-provider-diagnostics.server";

type LessonGenerationLogOutcome =
  | "success"
  | "needs_review"
  | "ai_disabled"
  | "in_flight"
  | "file_too_large"
  | "unsupported_file"
  | "extraction_failed"
  | "empty_text"
  | "download_failed"
  | "invalid_path"
  | "ai_failed"
  | "invalid_json"
  | "ai_timeout"
  | "ai_rate_limit";

type LessonGenerationLogEvent = {
  lessonId: string;
  model: string;
  extractedCharCount: number;
  durationMs: number;
  outcome: LessonGenerationLogOutcome;
};

/** Safe server diagnostics — never logs lesson text, API keys, or full AI payloads. */
export function logLessonGenerationEvent(event: LessonGenerationLogEvent): void {
  console.info("[lesson-ai]", {
    lessonId: event.lessonId,
    model: event.model,
    extractedCharCount: event.extractedCharCount,
    durationMs: event.durationMs,
    outcome: event.outcome,
  });
}

/** Server-only OpenAI/provider failure details for local debugging. */
export function logLessonGenerationProviderDiagnostic(
  lessonId: string,
  model: string,
  diagnostic: LessonGenerationProviderDiagnostic,
  context?: { attempt?: number; phase?: string },
): void {
  console.error("[lesson-ai-provider]", {
    lessonId,
    model,
    attempt: context?.attempt,
    phase: context?.phase,
    errorClass: diagnostic.errorClass,
    httpStatus: diagnostic.httpStatus ?? null,
    openAiType: diagnostic.openAiType ?? null,
    openAiCode: diagnostic.openAiCode ?? null,
    param: diagnostic.param ?? null,
    requestId: diagnostic.requestId ?? null,
    responseStatus: diagnostic.responseStatus ?? null,
    incompleteReason: diagnostic.incompleteReason ?? null,
    message: diagnostic.message,
  });
}
