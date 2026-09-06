import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LESSON_FILES_BUCKET } from "@/lib/upload";
import {
  extractLessonFileText,
  inferLessonFileType,
} from "@/lib/ai/lesson-file-extract.server";
import { logLessonGenerationEvent } from "@/lib/ai/lesson-generation-logger.server";
import { detectLessonSourceLanguage } from "@/lib/ai/detect-source-language.server";
import {
  mapMultilingualLessonFields,
  validateMultilingualLesson,
} from "@/lib/ai/lesson-multilingual-mapper";
import { translateLessonContent } from "@/lib/ai/translate-lesson-content.server";
import type {
  GenerateLessonFromFileInput,
  GenerateLessonFromFileResult,
  LessonAiOutput,
  LessonFileType,
} from "@/lib/ai/lesson-generation-types";
import {
  LESSON_AI_MAX_FILE_BYTES,
  LESSON_AI_MAX_PROMPT_CHARS,
  lessonAiOutputSchema,
} from "@/lib/ai/lesson-generation-types";
import { validateLessonAiOutputGuard } from "@/lib/ai/lesson-ai-output-guard";
import { getLessonGenerationProvider } from "@/lib/ai/providers/openai-lesson-generation-provider.server";
import type { LessonGenerationProviderErrorCode } from "@/lib/ai/providers/lesson-generation-provider";
import { isOpenAiConfigured } from "@/lib/ai/ignite-ai.server";
import { storagePathFromLessonFileUrl, lessonStoragePathOwnedByLesson } from "@/lib/lesson-main-file";
import {
  emptyLessonAiUsage,
  estimateLessonAiCostUsd,
  mergeLessonAiUsage,
} from "@/lib/ai/lesson-generation-usage.server";

const activeLessonGenerations = new Set<string>();

const LESSON_GENERATION_SYSTEM_PROMPT = `You are an educational assistant for Ignite Islamic Academy (Islamic Studies).

STRICT RULES:
- Generate content ONLY from the uploaded lesson text and teacher-provided lesson name, unit number, and learning outcome.
- Do NOT browse the web or use outside knowledge beyond clarifying lesson material.
- Do NOT invent Qur'an verses or Hadith texts.
- Do NOT fabricate religious references.
- If sacred Arabic text appears in the source, preserve it EXACTLY as written. Do not paraphrase Qur'anic wording.
- If exact Qur'an or Hadith text cannot be confidently grounded in the extracted file, do NOT generate or complete the quote.
- Never reconstruct missing sacred wording from model memory. Add a warning instead.
- All quiz questions must be answerable from the supplied lesson text only.
- Use the teacher's source language for all generated text fields.

QUIZ QUALITY:
- Produce exactly 4 multiple-choice, 4 true/false, and 2 essay questions.
- Multiple choice: exactly 4 unique options, one correct answer, plausible distractors grounded in the lesson.
- For multiple choice, set correctAnswer to the zero-based index of the correct option only (0 = first option, 1 = second, 2 = third, 3 = fourth). Never return option text for correctAnswer.
- True/false: unambiguous statements grounded in the lesson.
- Essay: include a concise model answer and grading guide.

VOCABULARY:
- Produce 5–10 vocabulary items drawn from the lesson.`;

function fail(
  error: string,
  errorCode: Extract<GenerateLessonFromFileResult, { ok: false }>["errorCode"],
  openAiConfigured: boolean,
  log: {
    lessonId: string;
    model: string;
    extractedCharCount: number;
    durationMs: number;
  },
): GenerateLessonFromFileResult {
  logLessonGenerationEvent({
    lessonId: log.lessonId,
    model: log.model,
    extractedCharCount: log.extractedCharCount,
    durationMs: log.durationMs,
    outcome: errorCode === "ai_disabled" ? "ai_disabled" : "ai_failed",
  });
  return {
    ok: false,
    status: errorCode === "ai_disabled" ? "disabled" : "failed",
    error,
    errorCode,
    serviceAvailable: openAiConfigured,
    openAiConfigured,
  };
}

function mapProviderError(
  code: LessonGenerationProviderErrorCode,
): { message: string; errorCode: Extract<GenerateLessonFromFileResult, { ok: false }>["errorCode"] } {
  switch (code) {
    case "not_configured":
      return {
        message: "AI service is not enabled. Please configure OPENAI_API_KEY on the server.",
        errorCode: "ai_disabled",
      };
    case "timeout":
      return { message: "AI generation timed out. Please try again.", errorCode: "ai_timeout" };
    case "rate_limit":
      return { message: "AI rate limit reached. Please wait and try again.", errorCode: "ai_rate_limit" };
    case "refused":
      return { message: "AI declined to generate this lesson content.", errorCode: "ai_failed" };
    case "invalid_output":
      return { message: "AI returned invalid lesson structure. Please retry.", errorCode: "invalid_json" };
    case "network":
    case "provider_error":
    default:
      return { message: "AI generation failed. Please try again.", errorCode: "ai_failed" };
  }
}

function buildUserPrompt(
  input: GenerateLessonFromFileInput,
  extractedText: string,
  sourceLanguage: "en" | "ar",
): string {
  const clipped =
    extractedText.length > LESSON_AI_MAX_PROMPT_CHARS
      ? `${extractedText.slice(0, LESSON_AI_MAX_PROMPT_CHARS)}\n\n[Source text truncated]`
      : extractedText;

  const langLabel = sourceLanguage === "ar" ? "Arabic" : "English";

  return `Source language: ${langLabel}

Teacher-provided fields:
- Lesson Name: ${input.lessonTitle}
- Unit Number: ${input.unitNumber}
- Learning Outcome: ${input.learningOutcome}

Uploaded lesson file text:
---
${clipped}
---

Generate lesson_summary, vocabulary (5–10 items), and quiz (4 MCQ, 4 T/F, 2 essay) in ${langLabel} only.`;
}

async function downloadLessonFile(
  lessonId: string,
  fileUrl: string,
): Promise<{ bytes: Uint8Array; fileName: string } | { error: string; errorCode: "download_failed" | "invalid_path" }> {
  const storagePath = storagePathFromLessonFileUrl(fileUrl);
  if (!storagePath || !lessonStoragePathOwnedByLesson(storagePath, lessonId)) {
    return { error: "Lesson file path is invalid for this lesson.", errorCode: "invalid_path" };
  }

  const { data, error } = await supabaseAdmin.storage.from(LESSON_FILES_BUCKET).download(storagePath);
  if (error || !data) {
    return { error: error?.message ?? "Could not download lesson file.", errorCode: "download_failed" };
  }

  const buffer = new Uint8Array(await data.arrayBuffer());
  const fileName = storagePath.split("/").pop() ?? "lesson-file";
  return { bytes: buffer, fileName };
}

export async function generateLessonFromFile(
  input: GenerateLessonFromFileInput,
): Promise<GenerateLessonFromFileResult> {
  const startedAt = Date.now();
  const openAiConfigured = isOpenAiConfigured();
  const provider = getLessonGenerationProvider();
  const model = provider.modelId();
  const logBase = {
    lessonId: input.lessonId,
    model,
    extractedCharCount: 0,
    durationMs: 0,
  };

  if (!openAiConfigured || !provider.isConfigured()) {
    return fail(
      "AI service is not enabled. Please configure OPENAI_API_KEY on the server.",
      "ai_disabled",
      false,
      { ...logBase, durationMs: Date.now() - startedAt },
    );
  }

  if (activeLessonGenerations.has(input.lessonId)) {
    return fail(
      "A generation is already in progress for this lesson. Please wait and try again.",
      "in_flight",
      openAiConfigured,
      { ...logBase, durationMs: Date.now() - startedAt },
    );
  }

  const fileType: LessonFileType | null = input.fileType ?? inferLessonFileType(input.fileName);
  if (!input.translateOnly && !fileType) {
    return fail("Unsupported file type. Allowed: PDF, PPT, PPTX.", "unsupported_file", openAiConfigured, {
      ...logBase,
      durationMs: Date.now() - startedAt,
    });
  }

  activeLessonGenerations.add(input.lessonId);
  try {
    let extractedCharCount = 0;
    let sourceFileName = input.fileName;
    let resolvedFileType: LessonFileType = fileType ?? "pdf";
    let sourceLanguage = input.sourceLanguage ?? "en";
    let sourceOutput: LessonAiOutput | null = input.sourceLesson ?? null;
    let sourceUsage = emptyLessonAiUsage();

    if (!input.translateOnly) {
      const downloaded = await downloadLessonFile(input.lessonId, input.fileUrl);
      if ("error" in downloaded) {
        return fail(downloaded.error, downloaded.errorCode, openAiConfigured, {
          ...logBase,
          durationMs: Date.now() - startedAt,
        });
      }

      if (downloaded.bytes.byteLength > LESSON_AI_MAX_FILE_BYTES) {
        return fail("File is too large for AI processing (max 100 MB).", "file_too_large", openAiConfigured, {
          ...logBase,
          durationMs: Date.now() - startedAt,
        });
      }

      const extracted = await extractLessonFileText(downloaded.bytes, fileType!);
      extractedCharCount = extracted.text.length;
      logBase.extractedCharCount = extractedCharCount;
      sourceFileName = input.fileName || downloaded.fileName;
      resolvedFileType = fileType!;

      if (extracted.error || !extracted.text.trim()) {
        return fail(
          extracted.error ?? "No readable text could be extracted from this file.",
          extracted.text.trim() ? "extraction_failed" : "empty_text",
          openAiConfigured,
          { ...logBase, durationMs: Date.now() - startedAt },
        );
      }

      sourceLanguage = detectLessonSourceLanguage({
        lessonTitle: input.lessonTitle,
        learningOutcome: input.learningOutcome,
        unitNumber: input.unitNumber,
        extractedText: extracted.text,
        hint: input.sourceLanguage,
      });

      const providerResult = await provider.generateStructuredLesson({
        lessonId: input.lessonId,
        systemPrompt: LESSON_GENERATION_SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(input, extracted.text, sourceLanguage),
      });

      if (!providerResult.ok) {
        const mapped = mapProviderError(providerResult.errorCode);
        return fail(mapped.message, mapped.errorCode, openAiConfigured, {
          ...logBase,
          durationMs: Date.now() - startedAt,
        });
      }

      const validated = lessonAiOutputSchema.safeParse(providerResult.data);
      if (!validated.success) {
        return fail("AI returned invalid lesson data.", "invalid_json", openAiConfigured, {
          ...logBase,
          durationMs: Date.now() - startedAt,
        });
      }

      sourceOutput = validated.data;

      const refusalGuard = validateLessonAiOutputGuard(sourceOutput);
      if (!refusalGuard.ok) {
        return fail(
          "AI returned refusal or meta-assistant text instead of lesson content. Please retry generation.",
          "ai_failed",
          openAiConfigured,
          { ...logBase, durationMs: Date.now() - startedAt },
        );
      }

      sourceUsage = providerResult.usage;

      if (input.sourceOnly) {
        const durationMs = Date.now() - startedAt;
        const mapped = mapMultilingualLessonFields({
          source: sourceOutput,
          sourceLanguage,
          lessonTitle: input.lessonTitle,
          unitNumber: input.unitNumber,
          learningOutcome: input.learningOutcome,
          translations: null,
          metadataBase: {
            generatedAt: new Date().toISOString(),
            sourceFileName,
            fileType: resolvedFileType,
            provider: provider.id,
            model,
            extractedCharCount,
            durationMs,
            sourceLanguage,
            usage: {
              source: sourceUsage,
              translation: emptyLessonAiUsage(),
              combined: sourceUsage,
              cost: estimateLessonAiCostUsd(model, sourceUsage),
            },
          },
          translationComplete: false,
        });
        return {
          ok: true,
          status: "generated",
          data: mapped,
          sourceLesson: sourceOutput,
          serviceAvailable: true,
          openAiConfigured: true,
        };
      }
    } else {
      if (!sourceOutput) {
        return fail("Source lesson payload is required for translation retry.", "invalid_json", openAiConfigured, {
          ...logBase,
          durationMs: Date.now() - startedAt,
        });
      }
      // Always detect from generated source content — never trust UI locale (ar UI + English file).
      sourceLanguage = detectLessonSourceLanguage({
        lessonTitle: input.lessonTitle,
        learningOutcome: input.learningOutcome,
        unitNumber: input.unitNumber,
        extractedText: sourceOutput.lesson_summary,
        hint: input.sourceLanguage,
      });
    }

    const translationResult = await translateLessonContent({
      lessonId: input.lessonId,
      sourceLanguage,
      lessonTitle: input.lessonTitle,
      unitNumber: input.unitNumber,
      learningOutcome: input.learningOutcome,
      source: sourceOutput,
    });

    const translationUsage = translationResult.usage;
    const combinedUsage = mergeLessonAiUsage(sourceUsage, translationUsage);
    const cost = estimateLessonAiCostUsd(model, combinedUsage);

    const translationComplete = translationResult.ok;
    const translationError = translationResult.ok ? undefined : translationResult.message;

    const durationMs = Date.now() - startedAt;
    const mapped = mapMultilingualLessonFields({
      source: sourceOutput,
      sourceLanguage,
      lessonTitle: input.lessonTitle,
      unitNumber: input.unitNumber,
      learningOutcome: input.learningOutcome,
      translations: translationResult.ok ? translationResult.data : null,
      metadataBase: {
        generatedAt: new Date().toISOString(),
        sourceFileName,
        fileType: resolvedFileType,
        provider: provider.id,
        model,
        extractedCharCount,
        durationMs,
        sourceLanguage,
        usage: {
          source: sourceUsage,
          translation: translationUsage,
          combined: combinedUsage,
          cost,
        },
      },
      translationComplete,
      translationError,
    });

    const validationIssues = validateMultilingualLesson(mapped);
    const status =
      !translationComplete
        ? "translation_partial"
        : validationIssues.length > 0 || mapped.metadata.needsReview
          ? "needs_review"
          : "generated";

    logLessonGenerationEvent({
      lessonId: input.lessonId,
      model,
      extractedCharCount,
      durationMs,
      outcome: status === "generated" ? "success" : status === "needs_review" ? "needs_review" : "ai_failed",
    });

    return {
      ok: true,
      status,
      data: mapped,
      sourceLesson: sourceOutput,
      serviceAvailable: true,
      openAiConfigured: true,
    };
  } finally {
    activeLessonGenerations.delete(input.lessonId);
  }
}

/** Test helper — expose in-flight guard size. */
export function activeLessonGenerationCount(): number {
  return activeLessonGenerations.size;
}
