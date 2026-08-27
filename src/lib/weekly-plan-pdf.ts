import {
  WEEKLY_PLAN_PDF_EXPORT_ID,
  type WeeklyPlanDocumentModel,
  safeWeeklyPlanFilename,
} from "@/lib/weekly-plan-document-model";

export const WEEKLY_PLAN_PDF_WIDTH_MM = 297;
export const WEEKLY_PLAN_PDF_HEIGHT_MM = 210;
export const WEEKLY_PLAN_PDF_WIDTH_PX = 1123;

export const WEEKLY_PLAN_PAGE_SAFE_TOP_PX = 8;
export const WEEKLY_PLAN_PAGE_SAFE_BOTTOM_PX = 8;

export const WEEKLY_PLAN_PAGE_HEIGHT_PX =
  (WEEKLY_PLAN_PDF_HEIGHT_MM / WEEKLY_PLAN_PDF_WIDTH_MM) * WEEKLY_PLAN_PDF_WIDTH_PX;

export const WEEKLY_PLAN_USABLE_PAGE_HEIGHT_PX =
  WEEKLY_PLAN_PAGE_HEIGHT_PX - WEEKLY_PLAN_PAGE_SAFE_TOP_PX - WEEKLY_PLAN_PAGE_SAFE_BOTTOM_PX;

const PDF_BACKGROUND = "#ffffff";
const LOGO_MAX_HEIGHT_PX = 28;
const LOGO_MAX_WIDTH_PX = 80;

export type WeeklyPlanCaptureDimensions = {
  scrollWidth: number;
  scrollHeight: number;
  boundingWidth: number;
  boundingHeight: number;
  maxImageRenderedHeight: number;
};

export type PdfRowSegment = {
  top: number;
  bottom: number;
  height: number;
};

export type WeeklyPlanPageRange = {
  start: number;
  end: number;
};

async function waitForPaint(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForDocumentImagesAndFonts(doc: Document): Promise<void> {
  if (doc.fonts?.ready) {
    await doc.fonts.ready;
  }

  const images = Array.from(doc.images);
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
    ),
  );

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForImages(root: HTMLElement): Promise<void> {
  const doc = root.ownerDocument;
  if (doc) {
    await waitForDocumentImagesAndFonts(doc);
    return;
  }
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  );
}

function absolutizeImageSources(root: HTMLElement, baseUrl: string): void {
  root.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;
    try {
      if (!src.startsWith("data:")) {
        img.setAttribute("src", new URL(src, baseUrl).href);
      }
    } catch {
      // keep original src
    }
    img.style.display = "block";
    img.style.visibility = "visible";
    img.style.opacity = "1";
    img.removeAttribute("hidden");
  });
}

export function constrainWeeklyPlanCaptureImages(root: HTMLElement): void {
  root.querySelectorAll("img").forEach((img) => {
    img.style.maxHeight = `${LOGO_MAX_HEIGHT_PX}px`;
    img.style.maxWidth = `${LOGO_MAX_WIDTH_PX}px`;
    img.style.width = "auto";
    img.style.height = "auto";
    img.style.objectFit = "contain";
    img.style.display = "block";
  });
}

/** Clone printable root preserving classes and embedded styles (matches Preview DOM). */
export function prepareWeeklyPlanCloneForCapture(source: HTMLElement): HTMLElement {
  if (source.id !== WEEKLY_PLAN_PDF_EXPORT_ID) {
    throw new Error(
      `PDF capture requires #${WEEKLY_PLAN_PDF_EXPORT_ID}, got #${source.id || "(no id)"}`,
    );
  }

  const clone = source.cloneNode(true) as HTMLElement;
  clone.id = WEEKLY_PLAN_PDF_EXPORT_ID;
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.transform = "none";
  clone.style.visibility = "visible";
  clone.style.opacity = "1";
  clone.style.width = `${WEEKLY_PLAN_PDF_WIDTH_PX}px`;
  clone.style.maxWidth = `${WEEKLY_PLAN_PDF_WIDTH_PX}px`;
  clone.style.overflow = "visible";
  clone.style.backgroundColor = PDF_BACKGROUND;
  clone.style.color = "#1a1a1a";
  clone.style.boxSizing = "border-box";

  constrainWeeklyPlanCaptureImages(clone);
  absolutizeImageSources(clone, window.location.origin);

  return clone;
}

export function measureWeeklyPlanCaptureDimensions(root: HTMLElement): WeeklyPlanCaptureDimensions {
  const rect = root.getBoundingClientRect();
  let maxImageRenderedHeight = 0;
  root.querySelectorAll("img").forEach((img) => {
    const imgRect = img.getBoundingClientRect();
    maxImageRenderedHeight = Math.max(maxImageRenderedHeight, imgRect.height);
  });

  return {
    scrollWidth: root.scrollWidth,
    scrollHeight: root.scrollHeight,
    boundingWidth: rect.width,
    boundingHeight: rect.height,
    maxImageRenderedHeight,
  };
}

function createPrintIframe(): {
  iframe: HTMLIFrameElement;
  mount: HTMLElement;
  cleanup: () => void;
} {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "weekly-plan-native-print");
  iframe.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${WEEKLY_PLAN_PDF_WIDTH_PX}px`,
    "height:100vh",
    "border:0",
    "margin:0",
    "padding:0",
    "opacity:0",
    "pointer-events:none",
    "z-index:2147483645",
  ].join(";");

  document.body.appendChild(iframe);

  const iDoc = iframe.contentDocument;
  if (!iDoc) {
    iframe.remove();
    throw new Error("Could not create print iframe");
  }

  iDoc.open();
  iDoc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=Inter:wght@400;600;700&family=Tajawal:wght@400;600;700&display=swap"></head><body style="margin:0;padding:0;background:${PDF_BACKGROUND};"></body></html>`,
  );
  iDoc.close();

  return {
    iframe,
    mount: iDoc.body,
    cleanup: () => iframe.remove(),
  };
}

/**
 * Native browser print — uses @media print / @page rules inside the document.
 * For PDF file: choose “Save as PDF” in the print dialog.
 */
export async function printWeeklyPlanNative(element: HTMLElement): Promise<void> {
  await waitForWeeklyPlanDocumentReady(element);

  const clone = prepareWeeklyPlanCloneForCapture(element);
  const { iframe, mount, cleanup } = createPrintIframe();

  try {
    mount.appendChild(clone);
    const iDoc = iframe.contentDocument;
    if (!iDoc) {
      throw new Error("Print iframe document unavailable");
    }
    await waitForDocumentImagesAndFonts(iDoc);
    await waitForPaint();

    const printWindow = iframe.contentWindow;
    if (!printWindow) {
      throw new Error("Print iframe window unavailable");
    }

    printWindow.focus();
    printWindow.print();
  } finally {
    window.setTimeout(() => cleanup(), 1500);
  }
}

/** @deprecated jsPDF/html2canvas removed — use native print + Save as PDF */
export async function renderWeeklyPlanPdfBlob(_element: HTMLElement): Promise<Blob> {
  throw new Error(
    "Automatic PDF blob generation was removed. Use printWeeklyPlanNative() and Save as PDF.",
  );
}

export function triggerWeeklyPlanPdfDownload(_blob: Blob, _filename: string): void {
  throw new Error("Automatic PDF download was removed. Use native print + Save as PDF.");
}

/**
 * Opens native print dialog for the weekly plan document.
 * User saves as PDF via the browser print dialog (Chrome: Destination → Save as PDF).
 */
export async function downloadWeeklyPlanPdf(
  element: HTMLElement,
  _model: WeeklyPlanDocumentModel,
): Promise<void> {
  await printWeeklyPlanNative(element);
}

export function safeWeeklyPlanFilenameForModel(model: WeeklyPlanDocumentModel): string {
  return safeWeeklyPlanFilename(model);
}

export async function waitForWeeklyPlanDocumentReady(root: HTMLElement): Promise<void> {
  await waitForPaint();
  await waitForImages(root);
}

/** Legacy row-slice helpers retained for unit tests only — not used for PDF output. */
export function collectPdfRowSegments(root: HTMLElement): PdfRowSegment[] {
  const rootRect = root.getBoundingClientRect();
  const segments: PdfRowSegment[] = [];
  root.querySelectorAll("table.wp-sheet tr").forEach((tr) => {
    const rect = tr.getBoundingClientRect();
    const top = Math.round(rect.top - rootRect.top);
    const bottom = Math.round(rect.bottom - rootRect.top);
    if (bottom > top) segments.push({ top, bottom, height: bottom - top });
  });
  return segments.sort((a, b) => a.top - b.top);
}

export function computeRowAwarePageSlices(
  documentHeight: number,
  rows: PdfRowSegment[],
  options?: { usablePageHeight?: number },
): WeeklyPlanPageRange[] {
  const usable = options?.usablePageHeight ?? WEEKLY_PLAN_USABLE_PAGE_HEIGHT_PX;
  const slices: WeeklyPlanPageRange[] = [];
  let start = 0;
  while (start < documentHeight - 1) {
    const pageLimit = start + usable;
    let end = start;
    for (const row of rows) {
      if (row.bottom <= start) continue;
      if (row.top >= pageLimit) break;
      if (row.bottom <= pageLimit) end = row.bottom;
      else if (row.height > usable) {
        if (end > start) break;
        end = Math.min(pageLimit, row.bottom);
        break;
      } else if (row.top > start) {
        end = row.top;
        break;
      } else {
        end = Math.min(pageLimit, row.bottom);
        break;
      }
    }
    if (end <= start) end = Math.min(pageLimit, documentHeight);
    if (end > start) slices.push({ start, end });
    start = end;
  }
  return slices;
}

export function computeWeeklyPlanPageSlices(
  documentHeight: number,
  breakPoints: number[],
): WeeklyPlanPageRange[] {
  const rows: PdfRowSegment[] = [];
  for (let i = 0; i < breakPoints.length - 1; i++) {
    const top = breakPoints[i];
    const bottom = breakPoints[i + 1];
    if (bottom > top) rows.push({ top, bottom, height: bottom - top });
  }
  return computeRowAwarePageSlices(documentHeight, rows);
}

export function validatePageSlicesNoGaps(
  documentHeight: number,
  slices: WeeklyPlanPageRange[],
): boolean {
  if (!slices.length || slices[0].start !== 0) return false;
  for (let i = 0; i < slices.length; i++) {
    if (slices[i].end <= slices[i].start) return false;
    if (i > 0 && slices[i].start !== slices[i - 1].end) return false;
  }
  return slices[slices.length - 1].end === documentHeight;
}
