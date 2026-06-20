import { chromium } from "playwright";

const url =
  process.argv[2] ||
  "https://ignite-academy.pages.dev/grades/8/2154336a-cbc1-42bb-9da5-654990c9f780?cb=9d03fec";

function isVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);

const result = await page.evaluate(() => {
  const visible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  };
  const header = document.querySelector("header");
  const breadcrumb = document.querySelector('nav[aria-label="Breadcrumb"]');
  const h1 = document.querySelector("main h1");
  const back = [...document.querySelectorAll("main a")].find((a) =>
    /العودة|Back to Grade/i.test(a.textContent || ""),
  );
  const resourceJump = document.querySelector('a[href="#lesson-video"]');
  const fab = [...document.querySelectorAll("button")].find((b) =>
    /Ask|اسأل/i.test(b.getAttribute("aria-label") || ""),
  );
  const hero = document.querySelector("main section .container-page");
  const card = document.querySelector("main .rounded-xl.border");
  const headerRect = header?.getBoundingClientRect();
  const h1Rect = h1?.getBoundingClientRect();
  const fabRect = fab?.getBoundingClientRect();

  return {
    headerHeight: headerRect ? Math.round(headerRect.height) : null,
    h1Top: h1Rect ? Math.round(h1Rect.top) : null,
    breadcrumbVisible: visible(breadcrumb),
    backVisible: visible(back),
    backText: back?.textContent?.trim() ?? null,
    resourceJumpVisible: visible(resourceJump),
    fabVisible: fabRect ? fabRect.width > 0 && fabRect.height > 0 : false,
    heroTopPadding: hero ? Math.round(parseFloat(getComputedStyle(hero).paddingTop)) : null,
    cardPadding: card ? getComputedStyle(card).padding : null,
    lessonTitle: h1?.textContent?.trim().slice(0, 80) ?? null,
  };
});

console.log(JSON.stringify(result, null, 2));
await page.screenshot({ path: "mobile-lesson-redesign.png", fullPage: false });
await browser.close();

const ok =
  !result.breadcrumbVisible &&
  result.backVisible &&
  result.resourceJumpVisible &&
  result.fabVisible &&
  result.h1Top > result.headerHeight &&
  result.heroTopPadding <= 24;

console.log(ok ? "\nPASS" : "\nFAIL");
process.exit(ok ? 0 : 1);
