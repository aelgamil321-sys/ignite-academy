import type { LessonAiUsage } from "@/lib/ai/lesson-generation-usage.server";
import type { LessonAiOutput } from "@/lib/ai/lesson-generation-types";
import type { z } from "zod";

export type LessonGenerationProviderRequest = {
  systemPrompt: string;
  userPrompt: string;
  lessonId: string;
};

export type LessonGenerationProviderErrorCode =
  | "not_configured"
  | "timeout"
  | "network"
  | "rate_limit"
  | "provider_error"
  | "invalid_output"
  | "refused";

export type LessonGenerationProviderResult =
  | { ok: true; data: LessonAiOutput; usage: LessonAiUsage }
  | { ok: false; errorCode: LessonGenerationProviderErrorCode; message: string; usage?: LessonAiUsage };

export type StructuredProviderRequest = LessonGenerationProviderRequest & {
  schema: z.ZodTypeAny;
  schemaName: string;
  feature: string;
};

export type StructuredProviderResult<T> =
  | { ok: true; data: T; usage: LessonAiUsage }
  | { ok: false; errorCode: LessonGenerationProviderErrorCode; message: string; usage?: LessonAiUsage };

export interface LessonGenerationProvider {
  readonly id: string;
  isConfigured(): boolean;
  modelId(): string;
  generateStructuredLesson(request: LessonGenerationProviderRequest): Promise<LessonGenerationProviderResult>;
  generateStructuredOutput<T>(request: StructuredProviderRequest): Promise<StructuredProviderResult<T>>;
}
