import { z } from "zod";
import type { Bi } from "@/lib/curriculum";
import type { QuizQuestion } from "@/lib/curriculum";
import type { VocabularyItem } from "@/lib/lesson-vocab";
import type { LessonAiCostEstimate, LessonAiUsage } from "@/lib/ai/lesson-generation-usage.server";

export const LESSON_AI_DEFAULT_MODEL = "gpt-5.6-terra";
export const LESSON_AI_REQUEST_TIMEOUT_MS = 120_000;
export const LESSON_AI_TRANSIENT_RETRY_DELAY_MS = 1_500;
/** Structured translation output for one language chunk (ar/fr/de or ur/zh). */
export const LESSON_AI_TRANSLATION_MAX_OUTPUT_TOKENS = 24_000;
export const LESSON_AI_SOURCE_MAX_OUTPUT_TOKENS = 12_000;

export const LESSON_AI_MAX_FILE_BYTES = 104_857_600;
export const LESSON_AI_MAX_EXTRACTED_CHARS = 100_000;
export const LESSON_AI_MAX_PROMPT_CHARS = 72_000;

export type LessonFileType = "pdf" | "pptx" | "ppt";

export type LessonGenerationStatus =
  | "ready"
  | "generating"
  | "generated"
  | "failed"
  | "needs_review"
  | "disabled";

export const mcQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string(),
});

export const tfQuestionSchema = z.object({
  statement: z.string().min(1),
  correctAnswer: z.boolean(),
  explanation: z.string(),
});

export const essayQuestionSchema = z.object({
  question: z.string().min(1),
  modelAnswer: z.string(),
  gradingGuide: z.string(),
});

/** Strict schema for OpenAI Structured Outputs + server-side Zod re-validation. */
export const lessonAiOutputSchema = z.object({
  lesson_summary: z.string().min(1),
  vocabulary: z
    .array(
      z.object({
        term: z.string().min(1),
        synonym_or_simple_meaning: z.string().min(1),
      }),
    )
    .min(5)
    .max(10),
  quiz: z.object({
    multiple_choice: z.array(mcQuestionSchema).length(4),
    true_false: z.array(tfQuestionSchema).length(4),
    essay: z.array(essayQuestionSchema).length(2),
  }),
  warnings: z.array(z.string()),
});

export type LessonAiOutput = z.infer<typeof lessonAiOutputSchema>;

export type LessonGenerationUsageReport = {
  source: LessonAiUsage;
  translation: LessonAiUsage;
  combined: LessonAiUsage;
  cost: LessonAiCostEstimate;
};

export type LessonGenerationMetadata = {
  generatedAt: string;
  sourceFileName: string;
  fileType: LessonFileType;
  provider: string;
  model: string;
  sourceLanguage: "en" | "ar";
  translationComplete: boolean;
  translationError?: string;
  warnings: string[];
  needsReview: boolean;
  extractedCharCount: number;
  durationMs?: number;
  usage?: LessonGenerationUsageReport;
};

export type LessonGenerationMappedResult = {
  title: Bi;
  unit: Bi;
  outcome: Bi;
  explanation: Bi;
  vocab: VocabularyItem[];
  quiz: QuizQuestion[];
  metadata: LessonGenerationMetadata;
};

export type GenerateLessonFromFileInput = {
  lessonId: string;
  fileUrl: string;
  fileName: string;
  fileType: LessonFileType;
  sourceLanguage?: "en" | "ar";
  lessonTitle: string;
  unitNumber: string;
  learningOutcome: string;
  /** Generate grounded source only (no translation). */
  sourceOnly?: boolean;
  /** Translate a prior source payload without re-generating from file. */
  translateOnly?: boolean;
  sourceLesson?: LessonAiOutput;
};

export type GenerateLessonFromFileResult =
  | {
      ok: true;
      status: "generated" | "needs_review" | "translation_partial";
      data: LessonGenerationMappedResult;
      sourceLesson: LessonAiOutput;
      serviceAvailable: true;
      openAiConfigured: true;
    }
  | {
      ok: false;
      status: "failed" | "disabled";
      error: string;
      errorCode:
        | "ai_disabled"
        | "in_flight"
        | "file_too_large"
        | "unsupported_file"
        | "extraction_failed"
        | "empty_text"
        | "ai_failed"
        | "invalid_json"
        | "download_failed"
        | "invalid_path"
        | "ai_timeout"
        | "ai_rate_limit"
        | "translation_failed";
      serviceAvailable: boolean;
      openAiConfigured: boolean;
    };
