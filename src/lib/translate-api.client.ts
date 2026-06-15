import type { Lang } from "@/lib/i18n-config";
import { translateContentBatch } from "@/lib/api/translate.functions";

export type TranslateApiRequest = {
  texts: string[];
  targetLang: Exclude<Lang, "en" | "ar">;
  sourceLang?: "en" | "ar";
  contentType?: string;
  lessonId?: string;
};

export type TranslateApiResponse = {
  translations: string[];
  serviceAvailable: boolean;
  providers?: string[];
};

/** Client → translation (server fn in app, POST /api/translate when called directly). */
export async function callTranslateApi(
  payload: TranslateApiRequest,
): Promise<TranslateApiResponse> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return (await res.json()) as TranslateApiResponse;
      }
    } catch {
      // fall through to server fn
    }
  }

  return translateContentBatch({ data: payload });
}
