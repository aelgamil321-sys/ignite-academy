#!/usr/bin/env node
/**
 * QA: search engine discovery (robots, sitemap, homepage meta, private noindex).
 * Usage: node scripts/qa-seo-discovery.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIST_CLIENT = join(ROOT, "dist", "client");
const CANONICAL = "https://ignite-academy.ignite-school.workers.dev";

const failures = [];
const passes = [];

function pass(msg) {
  passes.push(msg);
}

function fail(msg) {
  failures.push(msg);
}

function readDist(rel) {
  const p = join(DIST_CLIENT, rel);
  if (!existsSync(p)) {
    fail(`Missing dist file: ${rel}`);
    return "";
  }
  return readFileSync(p, "utf8");
}

function assertIncludes(haystack, needle, label) {
  if (haystack.includes(needle)) pass(label);
  else fail(`${label} — expected to include: ${needle}`);
}

function assertNotIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) pass(label);
  else fail(`${label} — should not include: ${needle}`);
}

// Static assets
const robots = readDist("robots.txt");
if (robots) {
  assertIncludes(robots, "User-agent:", "robots.txt has User-agent");
  assertIncludes(robots, `Sitemap: ${CANONICAL}/sitemap.xml`, "robots.txt sitemap URL");
  assertNotIncludes(robots, "Disallow: /$", "robots.txt does not block homepage");
}

const sitemap = readDist("sitemap.xml");
if (sitemap) {
  assertIncludes(sitemap, "<?xml", "sitemap.xml is XML");
  assertIncludes(sitemap, `<loc>${CANONICAL}/</loc>`, "sitemap includes homepage");
  assertNotIncludes(sitemap, "/student/", "sitemap excludes /student/");
  assertNotIncludes(sitemap, "/admin/", "sitemap excludes /admin/");
}

// SSR HTML — TanStack Start on Cloudflare may not emit a static index.html.
const indexHtmlPath = join(DIST_CLIENT, "index.html");
if (existsSync(indexHtmlPath)) {
  const indexHtml = readFileSync(indexHtmlPath, "utf8");
  assertIncludes(indexHtml, "Ignite Islamic Academy", "index.html brand name");
  assertIncludes(indexHtml, "أكاديمية اجنايت الإسلامية", "index.html Arabic name in JSON-LD or content");
  assertNotIncludes(indexHtml, "lovable.app", "index.html no lovable.app URLs");
  assertNotIncludes(indexHtml, "pages.dev", "index.html no pages.dev URLs");
} else {
  pass("index.html not emitted (SSR worker serves HTML — verify live after deploy)");
}

// Validate JSON-LD in seo module source
const seoSrc = readFileSync(join(ROOT, "src", "lib", "seo.ts"), "utf8");
if (seoSrc.includes("script:ld+json") && seoSrc.includes("EducationalOrganization")) {
  pass("seo.ts defines JSON-LD structured data");
} else {
  fail("seo.ts missing JSON-LD structured data");
}

// Validate no fake contact in public components
const footerSrc = readFileSync(join(ROOT, "src", "components", "site-footer.tsx"), "utf8");
const contactSrc = readFileSync(join(ROOT, "src", "routes", "contact.tsx"), "utf8");
assertNotIncludes(footerSrc, "hello@igniteislamic.academy", "footer has no placeholder email");
assertNotIncludes(footerSrc, "+1 (555)", "footer has no placeholder phone");
assertNotIncludes(contactSrc, "hello@igniteislamic.academy", "contact page has no placeholder email");
assertNotIncludes(contactSrc, "+1 (555)", "contact page has no placeholder phone");

// Private route noindex samples
const studentLayout = readFileSync(join(ROOT, "src", "lib", "student-layout.tsx"), "utf8");
const teacherLayout = readFileSync(join(ROOT, "src", "lib", "teacher-layout.tsx"), "utf8");
const parentLayout = readFileSync(join(ROOT, "src", "lib", "parent-layout.tsx"), "utf8");
const adminRoute = readFileSync(join(ROOT, "src", "routes", "admin.tsx"), "utf8");

assertIncludes(studentLayout, "noindex,nofollow", "student layout noindex");
assertIncludes(teacherLayout, "noindex,nofollow", "teacher layout noindex");
assertIncludes(parentLayout, "noindex,nofollow", "parent layout noindex");
assertIncludes(adminRoute, "noindex,nofollow", "admin route noindex");
assertNotIncludes(adminRoute, "rel: \"canonical\"", "admin route has no canonical");

// Canonical URL constant
assertIncludes(seoSrc, CANONICAL, "seo.ts canonical production URL");

console.log("\n=== SEO Discovery QA ===\n");
for (const p of passes) console.log(`PASS  ${p}`);
for (const f of failures) console.log(`FAIL  ${f}`);
console.log(`\n${passes.length} passed, ${failures.length} failed\n`);

if (failures.length > 0) process.exit(1);
