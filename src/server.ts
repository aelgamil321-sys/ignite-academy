import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { handleTranslateApi } from "./lib/api/translate-route.server";
import { handleIgniteApi } from "./lib/api/ai-route.server";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/translate") {
        return handleTranslateApi(request);
      }
      if (url.pathname === "/api/ignite/status" && request.method === "GET") {
        const { isIgniteAiConfigured, isOpenAiConfigured } = await import("@/lib/ai/ignite-ai.server");
        return new Response(
          JSON.stringify({
            serviceAvailable: isIgniteAiConfigured(),
            openAiConfigured: isOpenAiConfigured(),
            translateApiConfigured: Boolean(process.env.GOOGLE_TRANSLATE_API_KEY),
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (url.pathname.startsWith("/api/ignite")) {
        return handleIgniteApi(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
