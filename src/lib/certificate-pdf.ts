import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
  CERT_COLORS,
} from "@/components/quiz-certificate-document";

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

/**
 * Capture a full-size (1123×794) certificate element for PDF export.
 * Temporarily positions the element on-screen so mobile browsers paint it.
 */
export async function captureCertificateToImage(
  element: HTMLElement,
): Promise<string> {
  const style = element.style;
  const prev = {
    position: style.position,
    left: style.left,
    top: style.top,
    width: style.width,
    height: style.height,
    transform: style.transform,
    zIndex: style.zIndex,
    opacity: style.opacity,
    visibility: style.visibility,
    pointerEvents: style.pointerEvents,
  };

  style.position = "fixed";
  style.left = "0";
  style.top = "0";
  style.width = `${CERTIFICATE_WIDTH_PX}px`;
  style.height = `${CERTIFICATE_HEIGHT_PX}px`;
  style.transform = "none";
  style.zIndex = "2147483646";
  style.opacity = "1";
  style.visibility = "visible";
  style.pointerEvents = "none";
  style.backgroundColor = CERT_COLORS.cream;
  style.color = CERT_COLORS.darkGreen;

  await waitForPaint();

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: CERT_COLORS.cream,
      width: CERTIFICATE_WIDTH_PX,
      height: CERTIFICATE_HEIGHT_PX,
      windowWidth: CERTIFICATE_WIDTH_PX,
      windowHeight: CERTIFICATE_HEIGHT_PX,
      scrollX: 0,
      scrollY: -window.scrollY,
      logging: false,
      onclone: (clonedDoc) => {
        // Tailwind v4 theme CSS uses lab()/oklch() — html2canvas cannot parse those rules.
        clonedDoc
          .querySelectorAll('style, link[rel="stylesheet"]')
          .forEach((node) => node.remove());

        clonedDoc.body.style.setProperty("color", CERT_COLORS.darkGreen, "important");
        clonedDoc.body.style.setProperty("background-color", CERT_COLORS.cream, "important");

        const source = clonedDoc.getElementById("certificate-pdf-export-source");
        if (!source) return;

        source.style.setProperty("color", CERT_COLORS.darkGreen, "important");
        source.style.setProperty("background-color", CERT_COLORS.cream, "important");

        source.querySelectorAll("*").forEach((node) => {
          if (node instanceof HTMLElement) {
            node.removeAttribute("class");
          }
        });
      },
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error("html2canvas produced an empty canvas (0×0)");
    }

    return canvas.toDataURL("image/png");
  } finally {
    style.position = prev.position;
    style.left = prev.left;
    style.top = prev.top;
    style.width = prev.width;
    style.height = prev.height;
    style.transform = prev.transform;
    style.zIndex = prev.zIndex;
    style.opacity = prev.opacity;
    style.visibility = prev.visibility;
    style.pointerEvents = prev.pointerEvents;
  }
}

export async function downloadCertificatePdf(
  element: HTMLElement,
  studentName: string,
): Promise<void> {
  const imgData = await captureCertificateToImage(element);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  pdf.addImage(imgData, "PNG", 0, 0, 297, 210);

  const filename = safeCertificateFilename(studentName);
  const blob = pdf.output("blob");
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
