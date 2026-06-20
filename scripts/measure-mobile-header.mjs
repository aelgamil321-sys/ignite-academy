import { chromium } from "playwright";

const cacheBust = "cb=sticky64";
const pages = [
  { label: "homepage", url: `https://ignite-academy.pages.dev/?${cacheBust}` },
  { label: "grade-8", url: `https://ignite-academy.pages.dev/grades/8?${cacheBust}` },
  {
    label: "lesson",
    url: `https://ignite-academy.pages.dev/grades/8/2154336a-cbc1-42bb-9da5-654990c9f780?${cacheBust}`,
  },
  {
    label: "lesson-quiz-result",
    url: `https://ignite-academy.pages.dev/grades/8/2154336a-cbc1-42bb-9da5-654990c9f780?${cacheBust}#lesson-result`,
  },
  {
    label: "quizzes",
    url: `https://ignite-academy.pages.dev/quizzes?${cacheBust}`,
  },
];

async function inspectMobileHeader(page, { label, url }) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const result = await page.evaluate(() => {
    const header = document.querySelector("header");
    const chrome = document.querySelector("[data-site-header-chrome]");
    const spacer = document.querySelector("[data-site-header-spacer]");
    const shell = document.querySelector(".site-content-shell");
    const breadcrumb = document.querySelector('nav[aria-label="Breadcrumb"]');
    const h1 = document.querySelector("main h1");
    const fab = document.querySelector('button[aria-label*="Ask"], button[aria-label*="اسأل"]');
    const offset = getComputedStyle(document.documentElement).getPropertyValue(
      "--site-header-offset",
    );

    const headerRect = header?.getBoundingClientRect();
    const breadcrumbRect = breadcrumb?.getBoundingClientRect();
    const fabRect = fab?.getBoundingClientRect();

    const mobileBar = [...(header?.querySelectorAll("[data-site-header-bar]") ?? [])].find(
      (bar) => getComputedStyle(bar).display === "flex",
    );
    const desktopNav = header?.querySelector("nav.hidden.xl\\:flex");
    const tabletBar = header?.querySelector("[data-site-header-bar].hidden.md\\:flex.xl\\:hidden");
    const desktopBar = header?.querySelector("[data-site-header-bar].hidden.xl\\:flex");

    const mobileBarStyle = mobileBar ? getComputedStyle(mobileBar) : null;
    const desktopNavStyle = desktopNav ? getComputedStyle(desktopNav) : null;
    const tabletBarStyle = tabletBar ? getComputedStyle(tabletBar) : null;
    const desktopBarStyle = desktopBar ? getComputedStyle(desktopBar) : null;

    const headerLinks = header
      ? [...header.querySelectorAll("a, button")].map((el) => ({
          tag: el.tagName,
          aria: el.getAttribute("aria-label"),
          text: (el.textContent || "").trim().slice(0, 40),
          visible: el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0,
        }))
      : [];

    const headerStyle = header ? getComputedStyle(header) : null;
    const spacerStyle = spacer ? getComputedStyle(spacer) : null;

    return {
      hasSiteContentShell: Boolean(shell),
      hasHeaderSpacer: Boolean(spacer),
      cssVarSiteHeaderOffset: offset.trim(),
      headerPosition: headerStyle?.position ?? null,
      spacerDisplay: spacerStyle?.display ?? null,
      headerHeightPx: headerRect ? Math.round(headerRect.height) : null,
      chromeHeightPx: chrome ? Math.round(chrome.getBoundingClientRect().height) : null,
      spacerHeightPx: spacer ? Math.round(spacer.getBoundingClientRect().height) : null,
      breadcrumbInHeader: Boolean(header?.querySelector('nav[aria-label="Breadcrumb"]')),
      breadcrumbTopPx: breadcrumbRect ? Math.round(breadcrumbRect.top) : null,
      h1TopPx: h1 ? Math.round(h1.getBoundingClientRect().top) : null,
      overlapPx:
        headerRect && breadcrumbRect
          ? Math.round(headerRect.bottom - breadcrumbRect.top)
          : null,
      mobileBarDisplay: mobileBarStyle?.display ?? null,
      desktopNavDisplay: desktopNavStyle?.display ?? null,
      tabletBarDisplay: tabletBarStyle?.display ?? null,
      desktopBarDisplay: desktopBarStyle?.display ?? null,
      fabVisible: fabRect ? fabRect.width > 0 && fabRect.height > 0 : false,
      fabBottomPx: fabRect ? Math.round(window.innerHeight - fabRect.bottom) : null,
      headerControlCount: headerLinks.filter((l) => l.visible).length,
      visibleHeaderControls: headerLinks.filter((l) => l.visible),
    };
  });

  console.log(`\n=== ${label}: ${url} ===`);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
const results = [];

try {
  for (const entry of pages) {
    results.push({ ...entry, ...(await inspectMobileHeader(page, entry)) });
  }
} finally {
  await browser.close();
}

const failed = results.filter(
  (r) =>
    r.mobileBarDisplay !== "flex" ||
    r.desktopNavDisplay !== "none" ||
    r.desktopBarDisplay !== "none" ||
    r.breadcrumbInHeader ||
    (r.overlapPx !== null && r.overlapPx > 0) ||
    !r.fabVisible ||
    r.headerPosition !== "sticky" ||
    r.spacerDisplay === "block" ||
    (r.chromeHeightPx !== null && r.chromeHeightPx !== 64),
);

if (failed.length) {
  console.error("\nFAILED checks:", failed.map((f) => f.label).join(", "));
  process.exit(1);
}

console.log("\nAll mobile header checks passed.");
