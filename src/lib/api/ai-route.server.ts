import { z } from "zod";

import {
  handleIgniteTranslateBatch,
} from "@/lib/api/ai.functions";
import {
  ignitePregenerateLessonTranslations,
  igniteSuggestVocabMeanings,
} from "@/lib/ai/ignite-ai.server";

const translateSchema = z.object({
  texts: z.array(z.string().max(8000)),
  targetLang: z.enum(["fr", "de", "ur", "zh"]),
  sourceLang: z.enum(["en", "ar"]).optional(),
  contentType: z.string().optional(),
  lessonId: z.string().optional(),
  fieldNames: z.array(z.string()).optional(),
});

const vocabSchema = z.object({
  wordAr: z.string().max(500),
  wordEn: z.string().max(500),
});

const pregenerateSchema = z.object({
  lessonId: z.string(),
  fields: z.array(
    z.object({
      fieldName: z.string(),
      contentType: z.string(),
      text: z.string().max(8000),
      sourceLang: z.enum(["en", "ar"]).optional(),
    }),
  ),
});

/** POST /api/ignite/* — server-side AI; keys never reach the browser. */
export async function handleIgniteApi(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/ignite/, "") || "/";

  try {
    const body = await request.json();

    if (subpath === "/translate") {
      const data = translateSchema.parse(body);
      const result = await handleIgniteTranslateBatch(data);
      return json(result);
    }

    if (subpath === "/vocab-suggest") {
      const data = vocabSchema.parse(body);
      const result = await igniteSuggestVocabMeanings(data);
      return json(result);
    }

    if (subpath === "/pregenerate-lesson") {
      const data = pregenerateSchema.parse(body);
      const result = await ignitePregenerateLessonTranslations({
        lessonId: data.lessonId,
        fields: data.fields.map((f) => ({
          ...f,
          contentType: f.contentType as import("@/lib/translate-educational-content").EducationalContentType,
        })),
      });
      return json(result);
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return json({ error: message, serviceAvailable: false }, 400);
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}
