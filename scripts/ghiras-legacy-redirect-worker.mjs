/**
 * Legacy workers.dev hostname → official GHIRAS custom domain.
 * Deployed to Worker name `ignite-academy`.
 */
const TARGET_ORIGIN = "https://ghirasacademy.ae";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.hostname.toLowerCase() === "ghirasacademy.ae") {
      return new Response("Redirect misconfigured", { status: 500 });
    }
    const dest = `${TARGET_ORIGIN}${url.pathname}${url.search}`;
    return Response.redirect(dest, 301);
  },
};
