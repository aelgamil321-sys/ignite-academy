import OpenAI from "openai";

export type LessonGenerationProviderDiagnostic = {
  errorClass: string;
  httpStatus?: number;
  openAiType?: string;
  openAiCode?: string;
  param?: string;
  requestId?: string;
  responseStatus?: string;
  incompleteReason?: string;
  message: string;
};

const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9_-]{10,}/g,
  /Bearer\s+\S+/gi,
  /OPENAI_API_KEY\s*=\s*\S+/gi,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/gi,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
];

/** Strip secrets and truncate for server-only logs. */
export function sanitizeProviderMessage(message: string, maxLen = 400): string {
  let sanitized = message;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  const trimmed = sanitized.replace(/\s+/g, " ").trim();
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}…` : trimmed;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readApiErrorBody(err: OpenAI.APIError): {
  openAiType?: string;
  openAiCode?: string;
  param?: string;
} {
  const body = err.error;
  if (!body || typeof body !== "object") {
    return {};
  }
  const record = body as Record<string, unknown>;
  return {
    openAiType: readString(record.type) ?? readString(err.type),
    openAiCode: readString(record.code) ?? readString(err.code),
    param: readString(record.param) ?? readString(err.param),
  };
}

export function extractOpenAiErrorDiagnostic(err: unknown): LessonGenerationProviderDiagnostic {
  if (err instanceof OpenAI.APIError) {
    const body = readApiErrorBody(err);
    return {
      errorClass: err.constructor.name,
      httpStatus: typeof err.status === "number" ? err.status : undefined,
      openAiType: body.openAiType,
      openAiCode: body.openAiCode,
      param: body.param,
      requestId: readString(err.requestID),
      message: sanitizeProviderMessage(err.message || "OpenAI API error."),
    };
  }

  if (err instanceof Error) {
    return {
      errorClass: err.constructor.name,
      message: sanitizeProviderMessage(err.message || err.name || "Unknown error."),
    };
  }

  return {
    errorClass: typeof err,
    message: sanitizeProviderMessage(String(err)),
  };
}

export function extractOpenAiResponseDiagnostic(response: {
  id?: string;
  status?: string;
  incomplete_details?: { reason?: string } | null;
  error?: { code?: string; message?: string; type?: string; param?: string } | null;
}): LessonGenerationProviderDiagnostic {
  const responseError = response.error;
  return {
    errorClass: "OpenAIResponse",
    httpStatus: undefined,
    openAiType: readString(responseError?.type),
    openAiCode: readString(responseError?.code),
    param: readString(responseError?.param),
    requestId: readString(response.id),
    responseStatus: readString(response.status),
    incompleteReason: readString(response.incomplete_details?.reason),
    message: sanitizeProviderMessage(
      readString(responseError?.message) ??
        (response.status === "incomplete"
          ? `Response incomplete (${readString(response.incomplete_details?.reason) ?? "unknown reason"}).`
          : `Response status: ${response.status ?? "unknown"}.`),
    ),
  };
}
