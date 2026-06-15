import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  mergeProtectedSegments,
  splitIslamicProtectedText,
  translatableSegments,
} from "@/lib/islamic-text-protection";
import {
  isTranslationApiConfigured,
  machineTranslateBatch,
} from "@/lib/translate.server";

const translatableLang = z.enum(["fr", "de", "ur", "zh"]);

const translateInputSchema = z.object({
  texts: z.array(z.string().max(8000)),
  targetLang: translatableLang,
  sourceLang: z.enum(["en", "ar"]).optional(),
  contentType: z.string().optional(),
  lessonId: z.string().optional(),
});

/** Shared handler for server fn and POST /api/translate. */
export async function handleTranslateRequest(data: z.infer<typeof translateInputSchema>) {
  const sourceLang = data.sourceLang ?? "en";
  const results: string[] = [];
  let anyTranslated = false;
  const providers = new Set<string>();

  for (const text of data.texts) {
    const segments = splitIslamicProtectedText(text);
    const parts = translatableSegments(segments);
    if (parts.length === 0) {
      results.push(text);
      continue;
    }
    const batch = await machineTranslateBatch(parts, data.targetLang, sourceLang);
    anyTranslated = anyTranslated || batch.anyTranslated;
    for (const p of batch.providers) providers.add(p);
    results.push(mergeProtectedSegments(segments, batch.translations));
  }

  const serviceAvailable = isTranslationApiConfigured() || anyTranslated;
  return {
    translations: results,
    serviceAvailable,
    providers: [...providers],
  };
}

export const translateContentBatch = createServerFn({ method: "POST" })
  .inputValidator(translateInputSchema)
  .handler(async ({ data }) => handleTranslateRequest(data));
