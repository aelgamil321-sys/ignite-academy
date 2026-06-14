import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  mergeProtectedSegments,
  splitIslamicProtectedText,
  translatableSegments,
} from "@/lib/islamic-text-protection";
import { machineTranslateBatch } from "@/lib/translate.server";

const translatableLang = z.enum(["fr", "de", "ur", "zh"]);

export const translateContentBatch = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      texts: z.array(z.string().max(8000)),
      targetLang: translatableLang,
      sourceLang: z.enum(["en", "ar"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sourceLang = data.sourceLang ?? "en";
    const results: string[] = [];

    for (const text of data.texts) {
      const segments = splitIslamicProtectedText(text);
      const parts = translatableSegments(segments);
      if (parts.length === 0) {
        results.push(text);
        continue;
      }
      const translatedParts = await machineTranslateBatch(parts, data.targetLang, sourceLang);
      results.push(mergeProtectedSegments(segments, translatedParts));
    }

    return { translations: results };
  });
