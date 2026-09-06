import { SCHOOL_NAME, SITE_NAME, SITE_NAME_AR } from "@/lib/site-branding";

/** Canonical production origin — never localhost or pages.dev. */
export const CANONICAL_SITE_URL = "https://ignite-academy.ignite-school.workers.dev";

export const HOME_PAGE_TITLE = `${SITE_NAME} | ${SCHOOL_NAME}`;

export const HOME_PAGE_DESCRIPTION =
  "Ignite Islamic Academy offers bilingual Islamic education for KG through Grade 12 at Ignite School in Dubai, UAE — lessons, videos, quizzes, and learning resources.";

export const DEFAULT_OG_IMAGE_PATH = "/logos/ignite-school-2.jpeg";

/** Static public routes included in sitemap.xml (index pages only). */
export const PUBLIC_SITEMAP_PATHS = [
  "/",
  "/about",
  "/contact",
  "/hall-of-fame",
  "/grades",
  "/videos",
  "/quizzes",
  "/resources",
  "/announcements",
] as const;

/** Build absolute canonical URL for a route path. */
export function canonicalPath(path: string): string {
  if (!path || path === "/") return `${CANONICAL_SITE_URL}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${CANONICAL_SITE_URL}${normalized.replace(/\/+$/, "")}`;
}

export function absoluteOgImageUrl(): string {
  return `${CANONICAL_SITE_URL}${DEFAULT_OG_IMAGE_PATH}`;
}

/**
 * Google Search Console HTML meta verification.
 * Set VITE_GOOGLE_SITE_VERIFICATION in .env (or wrangler vars) to your token from Search Console.
 * Alternative: place the verification HTML file in public/ (e.g. public/google123abc.html).
 */
export function googleSiteVerificationMeta(): Array<{ name: string; content: string }> {
  const token = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION?.trim();
  if (!token) return [];
  return [{ name: "google-site-verification", content: token }];
}

export type PublicPageHeadOptions = {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogDescription?: string;
};

export function publicPageHead(options: PublicPageHeadOptions) {
  const url = canonicalPath(options.path);
  const ogTitle = options.ogTitle ?? options.title;
  const ogDescription = options.ogDescription ?? options.description;
  const ogImage = absoluteOgImageUrl();

  return {
    meta: [
      { title: options.title },
      { name: "description", content: options.description },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: ogTitle },
      { property: "og:description", content: ogDescription },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ogImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ogTitle },
      { name: "twitter:description", content: ogDescription },
      { name: "twitter:image", content: ogImage },
      ...googleSiteVerificationMeta(),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function homepageHead() {
  const url = canonicalPath("/");
  const ogImage = absoluteOgImageUrl();

  return {
    meta: [
      { title: HOME_PAGE_TITLE },
      { name: "description", content: HOME_PAGE_DESCRIPTION },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: HOME_PAGE_TITLE },
      { property: "og:description", content: HOME_PAGE_DESCRIPTION },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ogImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: HOME_PAGE_TITLE },
      { name: "twitter:description", content: HOME_PAGE_DESCRIPTION },
      { name: "twitter:image", content: ogImage },
      { "script:ld+json": homepageStructuredData() },
      ...googleSiteVerificationMeta(),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function homepageStructuredData() {
  const url = canonicalPath("/");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        url,
        name: SITE_NAME,
        alternateName: [SITE_NAME_AR, SCHOOL_NAME],
        inLanguage: ["en", "ar", "fr", "de", "ur", "zh"],
        publisher: { "@id": `${url}#organization` },
      },
      {
        "@type": "EducationalOrganization",
        "@id": `${url}#organization`,
        name: SITE_NAME,
        alternateName: SITE_NAME_AR,
        url,
        parentOrganization: {
          "@type": "Organization",
          name: SCHOOL_NAME,
        },
      },
    ],
  };
}

export function privateRouteHead(title: string, description?: string) {
  return {
    meta: [
      { title },
      ...(description ? [{ name: "description", content: description }] : []),
      { name: "robots", content: "noindex,nofollow" },
    ],
  };
}
