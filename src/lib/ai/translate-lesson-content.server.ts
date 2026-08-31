import {
  buildPartialLessonTranslationOutputSchema,
  LESSON_TRANSLATION_SCHEMA_NAME,
  LESSON_TRANSLATION_SYSTEM_PROMPT,
  translationLangChunks,
  type LessonTranslationOutput,
} from "@/lib/ai/lesson-translation-types";
import { getLessonGenerationProvider } from "@/lib/ai/providers/openai-lesson-generation-provider.server";
import type { LessonAiUsage } from "@/lib/ai/lesson-generation-usage.server";
import { emptyLessonAiUsage, mergeLessonAiUsage } from "@/lib/ai/lesson-generation-usage.server";
import { buildSourceLessonPayload } from "@/lib/ai/lesson-multilingual-mapper";
import type { LessonAiOutput } from "@/lib/ai/lesson-generation-types";
import { LESSON_AI_TRANSLATION_MAX_OUTPUT_TOKENS } from "@/lib/ai/lesson-generation-types";

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

function buildTranslationUserPrompt(input: TranslateLessonContentInput, targetLangs: string[]): string {
  const payload = buildSourceLessonPayload({
    lessonTitle: input.lessonTitle,
    unitNumber: input.unitNumber,
    learningOutcome: input.learningOutcome,
    source: input.source,
  });

  return `Source language: ${input.sourceLanguage === "ar" ? "Arabic" : "English"}

Translate the structured lesson below into ONLY these target languages: ${targetLangs.join(", ")}.

Return one object per requested language using the exact schema keys.
Preserve quiz correctAnswer indexes and true/false booleans exactly.
Do not translate unit_number — copy it unchanged into each language block as lesson metadata context only via lesson_title/outcome/summary fields.

Structured source lesson JSON:
${JSON.stringify(payload)}`;
}

function mapProviderErrorCode(
  errorCode: string | undefined,
): TranslateLessonContentResult["errorCode"] {
  if (errorCode === "timeout") return "ai_timeout";
  if (errorCode === "rate_limit") return "ai_rate_limit";
  if (errorCode === "invalid_output") return "invalid_json";
  return "ai_failed";
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

  const merged: Record<string, unknown> = {};
  let totalUsage = emptyLessonAiUsage();
  const chunks = translationLangChunks(input.sourceLanguage);

  for (const targetLangs of chunks) {
    const schema = buildPartialLessonTranslationOutputSchema(input.sourceLanguage, targetLangs);
    const result = await provider.generateStructuredOutput<Record<string, unknown>>({
      lessonId: input.lessonId,
      systemPrompt: LESSON_TRANSLATION_SYSTEM_PROMPT,
      userPrompt: buildTranslationUserPrompt(input, targetLangs),
      schema,
      schemaName: `${LESSON_TRANSLATION_SCHEMA_NAME}_${targetLangs.join("_")}`,
      feature: "lesson_translation",
      maxOutputTokens: LESSON_AI_TRANSLATION_MAX_OUTPUT_TOKENS,
    });

    if (!result.ok) {
      return {
        ok: false,
        errorCode: mapProviderErrorCode(result.errorCode),
        message: result.message,
        usage: mergeLessonAiUsage(totalUsage, result.usage ?? emptyLessonAiUsage()),
      };
    }

    Object.assign(merged, result.data);
    totalUsage = mergeLessonAiUsage(totalUsage, result.usage);
  }

  const fullSchema = buildPartialLessonTranslationOutputSchema(
    input.sourceLanguage,
    translationLangChunks(input.sourceLanguage).flat(),
  );
  const validated = fullSchema.safeParse(merged);
  if (!validated.success) {
    return {
      ok: false,
      errorCode: "invalid_json",
      message: "Merged translation output failed schema validation.",
      usage: totalUsage,
    };
  }

  return { ok: true, data: validated.data as LessonTranslationOutput, usage: totalUsage };
}
