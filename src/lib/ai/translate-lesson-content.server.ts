import {
  buildLessonTranslationOutputSchema,
  LESSON_TRANSLATION_SCHEMA_NAME,
  LESSON_TRANSLATION_SYSTEM_PROMPT,
  type LessonTranslationOutput,
} from "@/lib/ai/lesson-translation-types";
import { getLessonGenerationProvider } from "@/lib/ai/providers/openai-lesson-generation-provider.server";
import type { LessonAiUsage } from "@/lib/ai/lesson-generation-usage.server";
import { emptyLessonAiUsage } from "@/lib/ai/lesson-generation-usage.server";
import { buildSourceLessonPayload } from "@/lib/ai/lesson-multilingual-mapper";
import type { LessonAiOutput } from "@/lib/ai/lesson-generation-types";

export type TranslateLessonContentInput = {
  lessonId: string;
  sourceLanguage: "en" | "ar";
  lessonTitle: string;
  unitNumber: string;
  learningOutcome: string;
  source: LessonAiOutput;
};

export type TranslateLessonContentResult =
  | { ok: true; data: LessonTranslationOutput; usage: LessonAiUsage }
  | { ok: false; errorCode: "ai_disabled" | "ai_failed" | "invalid_json" | "ai_timeout" | "ai_rate_limit"; message: string; usage: LessonAiUsage };

function buildTranslationUserPrompt(input: TranslateLessonContentInput): string {
  const targetLangs =
    input.sourceLanguage === "en"
      ? "Arabic (ar), French (fr), German (de), Urdu (ur), Simplified Chinese (zh)"
      : "English (en), French (fr), German (de), Urdu (ur), Simplified Chinese (zh)";

  const payload = buildSourceLessonPayload({
    lessonTitle: input.lessonTitle,
    unitNumber: input.unitNumber,
    learningOutcome: input.learningOutcome,
    source: input.source,
  });

  return `Source language: ${input.sourceLanguage === "ar" ? "Arabic" : "English"}

Translate the structured lesson below into: ${targetLangs}.

Return one object per target language using the exact schema keys.
Preserve quiz correctAnswer indexes and true/false booleans exactly.
Do not translate unit_number — copy it unchanged into each language block as lesson metadata context only via lesson_title/outcome/summary fields.

Structured source lesson JSON:
${JSON.stringify(payload)}`;
}

export async function translateLessonContent(
  input: TranslateLessonContentInput,
): Promise<TranslateLessonContentResult> {
  const provider = getLessonGenerationProvider();
  if (!provider.isConfigured()) {
    return {
      ok: false,
      errorCode: "ai_disabled",
      message: "AI service is not enabled.",
      usage: emptyLessonAiUsage(),
    };
  }

  const schema = buildLessonTranslationOutputSchema(input.sourceLanguage);
  const result = await provider.generateStructuredOutput<LessonTranslationOutput>({
    lessonId: input.lessonId,
    systemPrompt: LESSON_TRANSLATION_SYSTEM_PROMPT,
    userPrompt: buildTranslationUserPrompt(input),
    schema,
    schemaName: LESSON_TRANSLATION_SCHEMA_NAME,
    feature: "lesson_translation",
  });

  if (!result.ok) {
    const errorCode =
      result.errorCode === "timeout"
        ? "ai_timeout"
        : result.errorCode === "rate_limit"
          ? "ai_rate_limit"
          : result.errorCode === "invalid_output"
            ? "invalid_json"
            : "ai_failed";
    return {
      ok: false,
      errorCode,
      message: result.message,
      usage: result.usage ?? emptyLessonAiUsage(),
    };
  }

  return { ok: true, data: result.data, usage: result.usage };
}
