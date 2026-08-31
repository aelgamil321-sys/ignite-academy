import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import {
  LESSON_AI_DEFAULT_MODEL,
  LESSON_AI_REQUEST_TIMEOUT_MS,
  LESSON_AI_TRANSIENT_RETRY_DELAY_MS,
  lessonAiOutputSchema,
  LESSON_AI_TRANSLATION_MAX_OUTPUT_TOKENS,
  LESSON_AI_SOURCE_MAX_OUTPUT_TOKENS,
} from "@/lib/ai/lesson-generation-types";
import { logLessonGenerationProviderDiagnostic } from "@/lib/ai/lesson-generation-logger.server";
import {
  extractOpenAiErrorDiagnostic,
  extractOpenAiResponseDiagnostic,
} from "@/lib/ai/openai-provider-diagnostics.server";
import {
  emptyLessonAiUsage,
  mergeLessonAiUsage,
  usageFromOpenAiResponse,
  type LessonAiUsage,
} from "@/lib/ai/lesson-generation-usage.server";
import type {
  LessonGenerationProvider,
  LessonGenerationProviderRequest,
  LessonGenerationProviderResult,
  StructuredProviderRequest,
  StructuredProviderResult,
} from "@/lib/ai/providers/lesson-generation-provider";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logProviderDiagnostic(
  lessonId: string,
  model: string,
  err: unknown,
  context?: { attempt?: number; phase?: string },
): void {
  logLessonGenerationProviderDiagnostic(lessonId, model, extractOpenAiErrorDiagnostic(err), context);
}

function mapThrownError(err: unknown): LessonGenerationProviderResult {
  if (err instanceof OpenAI.APIConnectionTimeoutError) {
    return { ok: false, errorCode: "timeout", message: "AI request timed out." };
  }
  if (err instanceof OpenAI.RateLimitError) {
    return { ok: false, errorCode: "rate_limit", message: "AI rate limit reached. Try again shortly." };
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return { ok: false, errorCode: "network", message: "AI network error. Please retry." };
  }
  if (err instanceof OpenAI.APIError) {
    return {
      ok: false,
      errorCode: "provider_error",
      message: `AI provider error (${err.status ?? "unknown"}).`,
    };
  }
  return { ok: false, errorCode: "provider_error", message: "AI generation failed." };
}

export class OpenAiLessonGenerationProvider implements LessonGenerationProvider {
  readonly id = "openai";

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }

  modelId(): string {
    return process.env.OPENAI_MODEL?.trim() || LESSON_AI_DEFAULT_MODEL;
  }

  private createClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    return new OpenAI({
      apiKey,
      timeout: LESSON_AI_REQUEST_TIMEOUT_MS,
      maxRetries: 0,
    });
  }

  private buildTextFormat(lessonId: string, model: string, schema: z.ZodTypeAny, schemaName: string) {
    try {
      return zodTextFormat(schema, schemaName);
    } catch (err) {
      logProviderDiagnostic(lessonId, model, err, { phase: "schema_format" });
      throw err;
    }
  }

  private async callStructuredOnce<T>(
    request: StructuredProviderRequest,
    attempt: number,
  ): Promise<StructuredProviderResult<T>> {
    const model = this.modelId();
    const client = this.createClient();
    const textFormat = this.buildTextFormat(request.lessonId, model, request.schema, request.schemaName);

    let response;
    try {
      response = await client.responses.parse({
        model,
        store: false,
        input: [
          { role: "developer", content: request.systemPrompt },
          { role: "user", content: request.userPrompt },
        ],
        text: {
          format: textFormat,
        },
        ...(request.maxOutputTokens ? { max_output_tokens: request.maxOutputTokens } : {}),
        metadata: {
          lesson_id: request.lessonId,
          feature: request.feature,
        },
      });
    } catch (err) {
      logProviderDiagnostic(request.lessonId, model, err, { attempt, phase: "responses_parse" });
      throw err;
    }

    const usage = usageFromOpenAiResponse(response.usage);

    if (response.status === "incomplete" || response.status === "failed") {
      const diagnostic = extractOpenAiResponseDiagnostic(response);
      logLessonGenerationProviderDiagnostic(request.lessonId, model, diagnostic, {
        attempt,
        phase: "response_status",
      });
      const incompleteSuffix =
        diagnostic.incompleteReason === "max_output_tokens"
          ? " (output token limit reached)"
          : diagnostic.incompleteReason
            ? ` (${diagnostic.incompleteReason})`
            : "";
      return {
        ok: false,
        errorCode: "provider_error",
        message: `AI could not complete structured ${request.feature} output${incompleteSuffix}.`,
        usage,
      };
    }

    if (!response.output_parsed) {
      logLessonGenerationProviderDiagnostic(
        request.lessonId,
        model,
        {
          errorClass: "OpenAIResponse",
          requestId: response.id,
          responseStatus: response.status,
          message: "AI returned no parsed structured output.",
        },
        { attempt, phase: "missing_output_parsed" },
      );
      return {
        ok: false,
        errorCode: "invalid_output",
        message: "AI returned incomplete structured lesson output.",
        usage,
      };
    }

    const validated = request.schema.safeParse(response.output_parsed);
    if (!validated.success) {
      logLessonGenerationProviderDiagnostic(
        request.lessonId,
        model,
        {
          errorClass: "ZodValidation",
          requestId: response.id,
          responseStatus: response.status,
          message: `Structured output failed Zod validation (${validated.error.issues.length} issue(s)).`,
        },
        { attempt, phase: "zod_validation" },
      );
      return {
        ok: false,
        errorCode: "invalid_output",
        message: "Structured lesson output failed schema validation.",
        usage,
      };
    }

    return { ok: true, data: validated.data as T, usage };
  }

  async generateStructuredOutput<T>(
    request: StructuredProviderRequest,
  ): Promise<StructuredProviderResult<T>> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        errorCode: "not_configured",
        message: "OPENAI_API_KEY is not configured on the server.",
        usage: emptyLessonAiUsage(),
      };
    }

    try {
      const first = await this.callStructuredOnce<T>(request, 1);
      if (first.ok) return first;

      const retryable =
        first.errorCode === "network" ||
        first.errorCode === "rate_limit" ||
        first.errorCode === "timeout" ||
        first.errorCode === "provider_error";

      if (!retryable) return first;

      await sleep(LESSON_AI_TRANSIENT_RETRY_DELAY_MS);
      const second = await this.callStructuredOnce<T>(request, 2);
      if (!second.ok && first.usage && second.usage) {
        return { ...second, usage: mergeLessonAiUsage(first.usage, second.usage) };
      }
      if (second.ok && first.usage) {
        return { ...second, usage: mergeLessonAiUsage(first.usage, second.usage) };
      }
      return second;
    } catch (err) {
      logProviderDiagnostic(request.lessonId, this.modelId(), err, { phase: "generate_structured_output" });
      return mapThrownError(err);
    }
  }

  async generateStructuredLesson(
    request: LessonGenerationProviderRequest,
  ): Promise<LessonGenerationProviderResult> {
    return this.generateStructuredOutput({
      ...request,
      schema: lessonAiOutputSchema,
      schemaName: "ignite_lesson_generation_output",
      feature: "lesson_generation",
      maxOutputTokens: LESSON_AI_SOURCE_MAX_OUTPUT_TOKENS,
    });
  }
}

let defaultProvider: LessonGenerationProvider | undefined;

export function getLessonGenerationProvider(): LessonGenerationProvider {
  if (!defaultProvider) defaultProvider = new OpenAiLessonGenerationProvider();
  return defaultProvider;
}

export function setLessonGenerationProvider(provider: LessonGenerationProvider): void {
  defaultProvider = provider;
}
