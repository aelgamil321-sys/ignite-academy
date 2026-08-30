export type LessonAiUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
};

export type LessonAiCostEstimate = {
  estimatedCostUsd: number;
  model: string;
  pricingVersion: string;
};

export const LESSON_AI_PRICING_VERSION = "gpt-5.6-terra-2026-08";

/** USD per token — update here when OpenAI pricing changes. */
export const LESSON_AI_MODEL_PRICING: Record<
  string,
  { inputPerToken: number; outputPerToken: number; cachedInputPerToken: number }
> = {
  "gpt-5.6-terra": {
    inputPerToken: 2 / 1_000_000,
    outputPerToken: 12 / 1_000_000,
    cachedInputPerToken: 0.2 / 1_000_000,
  },
};

export function emptyLessonAiUsage(): LessonAiUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    cachedInputTokens: 0,
    reasoningTokens: 0,
  };
}

export function mergeLessonAiUsage(a: LessonAiUsage, b: LessonAiUsage): LessonAiUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
    reasoningTokens: a.reasoningTokens + b.reasoningTokens,
  };
}

type OpenAiUsageLike = {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  input_tokens_details?: { cached_tokens?: number } | null;
  output_tokens_details?: { reasoning_tokens?: number } | null;
};

export function usageFromOpenAiResponse(usage: OpenAiUsageLike | null | undefined): LessonAiUsage {
  if (!usage) return emptyLessonAiUsage();
  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    totalTokens: usage.total_tokens ?? (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
    cachedInputTokens: usage.input_tokens_details?.cached_tokens ?? 0,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens ?? 0,
  };
}

export function estimateLessonAiCostUsd(model: string, usage: LessonAiUsage): LessonAiCostEstimate {
  const pricing =
    LESSON_AI_MODEL_PRICING[model] ??
    LESSON_AI_MODEL_PRICING["gpt-5.6-terra"];
  const uncachedInput = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  const estimatedCostUsd =
    uncachedInput * pricing.inputPerToken +
    usage.cachedInputTokens * pricing.cachedInputPerToken +
    usage.outputTokens * pricing.outputPerToken;

  return {
    estimatedCostUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
    model,
    pricingVersion: LESSON_AI_PRICING_VERSION,
  };
}

/** Rough lessons-per-$10 at the same token profile as a reference usage sample. */
export function estimateLessonsPerTenDollars(referenceTotalCostUsd: number): number | null {
  if (!referenceTotalCostUsd || referenceTotalCostUsd <= 0) return null;
  return Math.floor(10 / referenceTotalCostUsd);
}
