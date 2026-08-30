import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { isOpenAiConfigured } from "@/lib/ai/ignite-ai.server";
import {
  buildTimetableTranscriptionVisionContent,
  timetableTextModel,
  timetableVisionModel,
} from "@/lib/timetable/timetable-vision-request";
import {
  emptyLessonAiUsage,
  mergeLessonAiUsage,
  usageFromOpenAiResponse,
  type LessonAiUsage,
} from "@/lib/ai/lesson-generation-usage.server";
import type { TimetableExtractedContent } from "@/lib/timetable/timetable-file-extract.server";
import type { TimetableSchedule } from "@/lib/timetable/timetable-types";
import {
  aiTranscriptionMatrixSchema,
  convertTranscriptionToSchedule,
  TIMETABLE_TRANSCRIPTION_SYSTEM_PROMPT,
  TIMETABLE_SCHOOL_DAYS,
  TIMETABLE_PERIOD_KEYS,
} from "@/lib/timetable/timetable-transcription";

const TIMETABLE_REQUEST_TIMEOUT_MS = 90_000;
const TIMETABLE_TRANSIENT_RETRY_DELAY_MS = 1_500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultModel(content: TimetableExtractedContent): string {
  return content.mode === "image" ? timetableVisionModel() : timetableTextModel();
}

function buildUserContent(
  content: TimetableExtractedContent,
  fileName: string,
): OpenAI.Responses.ResponseInputMessageContentList {
  if (content.mode === "image") {
    return buildTimetableTranscriptionVisionContent({
      mimeType: content.mimeType,
      base64: content.base64,
      fileName,
    });
  }

  const hint = content.hint ? `\n\nExtraction note: ${content.hint}` : "";
  const layout = `ROWS: ${TIMETABLE_SCHOOL_DAYS.join(", ")}
COLUMNS: ${TIMETABLE_PERIOD_KEYS.map((k) => `Period ${k}`).join(", ")}`;

  return [
    {
      type: "input_text",
      text: `Transcribe the exact 5×7 teaching-period matrix from this timetable source (${fileName}).

${layout}

Return only subject and text per cell. Do not return times, periods, or slot types.${hint}

SOURCE TEXT:
${content.text}`,
    },
  ];
}

function mapAiTranscriptionToSchedule(
  raw: ReturnType<typeof aiTranscriptionMatrixSchema.parse>,
): TimetableSchedule {
  return convertTranscriptionToSchedule(raw);
}

export type ExtractTimetableAiResult =
  | {
      ok: true;
      schedule: TimetableSchedule;
      usage: LessonAiUsage;
      model: string;
    }
  | {
      ok: false;
      error: string;
      errorCode:
        | "ai_disabled"
        | "provider_error"
        | "invalid_output"
        | "timeout"
        | "rate_limit"
        | "network";
      usage?: LessonAiUsage;
    };

async function callTimetableAiOnce(
  content: TimetableExtractedContent,
  fileName: string,
  teacherId: string,
  attempt: number,
): Promise<ExtractTimetableAiResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "AI is not configured.", errorCode: "ai_disabled" };
  }

  const model = defaultModel(content);
  const client = new OpenAI({
    apiKey,
    timeout: TIMETABLE_REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });

  let response;
  try {
    response = await client.responses.parse({
      model,
      store: false,
      input: [
        { role: "developer", content: TIMETABLE_TRANSCRIPTION_SYSTEM_PROMPT },
        { role: "user", content: buildUserContent(content, fileName) },
      ],
      text: {
        format: zodTextFormat(aiTranscriptionMatrixSchema, "teacher_timetable_transcription"),
      },
      metadata: {
        teacher_id: teacherId,
        feature: "teacher_timetable_transcription",
        attempt: String(attempt),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("ZodDefault")) {
      console.error("[timetable-ai] Structured output schema error", { message: err.message, model, attempt });
      return {
        ok: false,
        error: err.message,
        errorCode: "invalid_output",
      };
    }
    if (err instanceof OpenAI.APIError) {
      console.error("[timetable-ai] OpenAI API error", {
        status: err.status,
        message: err.message,
        code: err.code,
        type: err.type,
        model,
        attempt,
      });
      const retryableStatus = err.status === 429 || (err.status != null && err.status >= 500);
      return {
        ok: false,
        error: err.message || "AI extraction failed.",
        errorCode: retryableStatus ? "rate_limit" : "provider_error",
      };
    }
    if (err instanceof OpenAI.APIConnectionTimeoutError) {
      return { ok: false, error: "AI request timed out.", errorCode: "timeout" };
    }
    if (err instanceof OpenAI.RateLimitError) {
      return { ok: false, error: "AI rate limit reached.", errorCode: "rate_limit" };
    }
    if (err instanceof OpenAI.APIConnectionError) {
      return { ok: false, error: "AI network error.", errorCode: "network" };
    }
    return { ok: false, error: "AI extraction failed.", errorCode: "provider_error" };
  }

  const usage = usageFromOpenAiResponse(response.usage);

  if (!response.output_parsed) {
    return {
      ok: false,
      error: "AI returned no transcription matrix.",
      errorCode: "invalid_output",
      usage,
    };
  }

  const aiParsed = aiTranscriptionMatrixSchema.safeParse(response.output_parsed);
  if (!aiParsed.success) {
    return {
      ok: false,
      error: "AI transcription failed validation.",
      errorCode: "invalid_output",
      usage,
    };
  }

  return {
    ok: true,
    schedule: mapAiTranscriptionToSchedule(aiParsed.data),
    usage,
    model,
  };
}

export async function extractTimetableWithAi(input: {
  content: TimetableExtractedContent;
  fileName: string;
  teacherId: string;
}): Promise<ExtractTimetableAiResult> {
  if (!isOpenAiConfigured()) {
    return { ok: false, error: "AI is not configured.", errorCode: "ai_disabled" };
  }

  const first = await callTimetableAiOnce(input.content, input.fileName, input.teacherId, 1);
  if (first.ok) return first;

  const retryable =
    first.errorCode === "network" ||
    first.errorCode === "rate_limit" ||
    first.errorCode === "timeout";

  if (!retryable) return first;

  await sleep(TIMETABLE_TRANSIENT_RETRY_DELAY_MS);
  const second = await callTimetableAiOnce(input.content, input.fileName, input.teacherId, 2);
  if (first.usage && second.usage) {
    const merged = mergeLessonAiUsage(first.usage, second.usage);
    if (second.ok) return { ...second, usage: merged };
    return { ...second, usage: merged };
  }
  if (second.ok) return second;
  return second;
}

export function emptyTimetableUsage(): LessonAiUsage {
  return emptyLessonAiUsage();
}
