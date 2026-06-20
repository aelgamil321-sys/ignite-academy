import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { handleIgniteTranslateBatch } from "@/lib/api/ai.functions";

const translatableLang = z.enum(["fr", "de", "ur", "zh"]);

const translateInputSchema = z.object({
  texts: z.array(z.string().max(8000)),
  targetLang: translatableLang,
  sourceLang: z.enum(["en", "ar"]).optional(),
  contentType: z.string().optional(),
  lessonId: z.string().optional(),
  fieldNames: z.array(z.string()).optional(),
});

/** Shared handler for server fn and POST /api/translate (Ignite AI + DB cache). */
export async function handleTranslateRequest(data: z.infer<typeof translateInputSchema>) {
  const result = await handleIgniteTranslateBatch(data);
  return {
    translations: result.translations,
    serviceAvailable: result.serviceAvailable,
    providers: result.providers,
    fromCache: result.fromCache,
  };
}

export const translateContentBatch = createServerFn({ method: "POST" })
  .inputValidator(translateInputSchema)
  .handler(async ({ data }) => handleTranslateRequest(data));
