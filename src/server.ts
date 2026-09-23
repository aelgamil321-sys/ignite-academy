import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { handleTranslateApi } from "./lib/api/translate-route.server";
import { handleIgniteApi } from "./lib/api/ai-route.server";
import { renderErrorPage } from "./lib/error-page";
import { CANONICAL_SITE_URL } from "./lib/seo";

const LEGACY_PUBLIC_HOSTS = new Set([
  "ghiras-academy.ignite-school.workers.dev",
  "ignite-academy.ignite-school.workers.dev",
]);

function redirectLegacyPublicHost(request: Request): Response | null {
  const url = new URL(request.url);
  if (!LEGACY_PUBLIC_HOSTS.has(url.hostname.toLowerCase())) return null;
  return Response.redirect(`${CANONICAL_SITE_URL}${url.pathname}${url.search}`, 301);
}

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
      const legacyRedirect = redirectLegacyPublicHost(request);
      if (legacyRedirect) return legacyRedirect;
      const url = new URL(request.url);
      if (url.pathname === "/sitemap.xml") {
        const { sitemapResponse } = await import("@/lib/sitemap.server");
        return sitemapResponse();
      }
      if (url.pathname === "/api/translate") {
        return handleTranslateApi(request);
      }
      if (url.pathname === "/api/ignite/status" && request.method === "GET") {
        const { isOpenAiConfigured } = await import("@/lib/ai/ignite-ai.server");
        const {
          getSupabaseServerEnvStatus,
          isLessonAiServerEnvConfigured,
        } = await import("@/lib/config.server");
        const supabaseStatus = getSupabaseServerEnvStatus();
        return new Response(
          JSON.stringify({
            serviceAvailable: isLessonAiServerEnvConfigured(),
            openAiConfigured: isOpenAiConfigured(),
            translateApiConfigured: Boolean(process.env.GOOGLE_TRANSLATE_API_KEY),
            ...supabaseStatus,
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
