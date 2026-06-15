import { z } from "zod";

import { handleTranslateRequest } from "@/lib/api/translate.functions";

const bodySchema = z.object({
  texts: z.array(z.string().max(8000)),
  targetLang: z.enum(["fr", "de", "ur", "zh"]),
  sourceLang: z.enum(["en", "ar"]).optional(),
  contentType: z.string().optional(),
  lessonId: z.string().optional(),
});

/** POST /api/translate — server-side only; no API keys in the browser. */
export async function handleTranslateApi(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const json = await request.json();
    const data = bodySchema.parse(json);
    const result = await handleTranslateRequest(data);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return new Response(JSON.stringify({ error: message, serviceAvailable: false }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}
