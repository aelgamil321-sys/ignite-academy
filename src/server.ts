import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type CloudflareEnv = {
  ASSETS?: { fetch: typeof fetch };
};

/** Secondary stage card — public asset key uses Unicode; requests arrive percent-encoded. */
const SECONDARY_STAGE_IMAGE_PATH = "/images/الثانوية.jpg";

async function tryServeSecondaryStageImage(
  request: Request,
  env: CloudflareEnv,
): Promise<Response | undefined> {
  const url = new URL(request.url);
  const encodedPath = `/images/${encodeURIComponent("الثانوية.jpg")}`;
  if (url.pathname !== SECONDARY_STAGE_IMAGE_PATH && url.pathname !== encodedPath) {
    return undefined;
  }

  const assets = env.ASSETS;
  if (!assets) return undefined;

  const assetUrl = new URL(request.url);
  assetUrl.pathname = SECONDARY_STAGE_IMAGE_PATH;
  const response = await assets.fetch(new Request(assetUrl, request));
  return response.ok ? response : undefined;
}

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
      const assetResponse = await tryServeSecondaryStageImage(request, env as CloudflareEnv);
      if (assetResponse) return assetResponse;

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
