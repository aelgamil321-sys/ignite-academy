import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { CERTIFICATE_EXPORT_ID } from "@/components/certificate-export";
import {
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
} from "@/components/certificate-body";

const PDF_BACKGROUND = "#FFFDF5";

export function safeCertificateFilename(studentName: string): string {
  const safe =
    studentName
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60) || "student";
  return `certificate-${safe}.pdf`;
}

async function waitForPaint(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function waitForImages(root: HTMLElement): Promise<void> {
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

function stripClasses(root: HTMLElement): void {
  root.removeAttribute("class");
  root.querySelectorAll("[class]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.removeAttribute("class");
    }
  });
}

function prepareCloneForCapture(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  stripClasses(clone);
  clone.id = CERTIFICATE_EXPORT_ID;
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.transform = "none";
  clone.style.visibility = "visible";
  clone.style.opacity = "1";
  clone.style.zIndex = "auto";
  clone.style.pointerEvents = "none";
  clone.style.width = `${CERTIFICATE_WIDTH_PX}px`;
  clone.style.height = `${CERTIFICATE_HEIGHT_PX}px`;
  clone.style.backgroundColor = PDF_BACKGROUND;
  clone.style.color = "#0F3D2E";
  return clone;
}

function createIsolatedCaptureDocument(): {
  iframe: HTMLIFrameElement;
  mount: HTMLElement;
  cleanup: () => void;
} {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "certificate-pdf-capture");
  iframe.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${CERTIFICATE_WIDTH_PX}px`,
    `height:${CERTIFICATE_HEIGHT_PX}px`,
    "border:0",
    "margin:0",
    "padding:0",
    "opacity:0",
    "pointer-events:none",
    "z-index:2147483646",
  ].join(";");

  document.body.appendChild(iframe);

  const iDoc = iframe.contentDocument;
  if (!iDoc) {
    iframe.remove();
    throw new Error("Could not create isolated capture iframe");
  }

  iDoc.open();
  iDoc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background-color:${PDF_BACKGROUND};color:#0F3D2E;"></body></html>`,
  );
  iDoc.close();

  const mount = iDoc.body;

  return {
    iframe,
    mount,
    cleanup: () => {
      iframe.remove();
    },
  };
}

/**
 * Capture #certificate-export inside an isolated iframe (no app stylesheets / lab() colors).
 */
export async function captureCertificateToImage(
  element: HTMLElement,
): Promise<string> {
  if (element.id !== CERTIFICATE_EXPORT_ID) {
    throw new Error(
      `PDF capture requires #${CERTIFICATE_EXPORT_ID}, got #${element.id || "(no id)"}`,
    );
  }

  const clone = prepareCloneForCapture(element);
  const { mount, cleanup } = createIsolatedCaptureDocument();

  mount.appendChild(clone);

  await waitForPaint();
  await waitForImages(clone);

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: PDF_BACKGROUND,
      width: CERTIFICATE_WIDTH_PX,
      height: CERTIFICATE_HEIGHT_PX,
      windowWidth: CERTIFICATE_WIDTH_PX,
      windowHeight: CERTIFICATE_HEIGHT_PX,
      scrollX: 0,
      scrollY: 0,
      logging: false,
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("html2canvas produced an empty canvas (0×0)");
    }

    return canvas.toDataURL("image/png");
  } finally {
    cleanup();
  }
}

/**
 * Render the certificate to a PDF Blob from #certificate-export.
 * Single source of truth for both the in-modal preview and the download.
 */
export async function renderCertificatePdfBlob(
  element: HTMLElement,
): Promise<Blob> {
  const imgData = await captureCertificateToImage(element);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  pdf.addImage(imgData, "PNG", 0, 0, 297, 210);
  return pdf.output("blob");
}

/** Trigger a browser download for an already-generated certificate PDF Blob. */
export function triggerCertificatePdfDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadCertificatePdf(
  element: HTMLElement,
  studentName: string,
): Promise<void> {
  const blob = await renderCertificatePdfBlob(element);
  triggerCertificatePdfDownload(blob, safeCertificateFilename(studentName));
}
