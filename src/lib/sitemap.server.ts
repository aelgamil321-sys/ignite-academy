import { CANONICAL_SITE_URL, PUBLIC_SITEMAP_PATHS } from "@/lib/seo";

/** Render sitemap XML for Search Console and crawlers. */
export function renderSitemapXml(lastmod = new Date().toISOString().slice(0, 10)): string {
  const urls = PUBLIC_SITEMAP_PATHS.map((path) => {
    const loc = path === "/" ? `${CANONICAL_SITE_URL}/` : `${CANONICAL_SITE_URL}${path}`;
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** HTTP 200 sitemap response with explicit XML headers for Google Search Console. */
export function sitemapResponse(): Response {
  const body = renderSitemapXml();
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
