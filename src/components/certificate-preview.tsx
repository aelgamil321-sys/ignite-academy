import { forwardRef, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { CertificateDisplayData } from "@/lib/certificate";
import {
  CertificatePageBody,
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
  certificatePageStyle,
} from "@/components/certificate-body";

/** PDF-safe root colors — avoids theme CSS variables (lab/oklch) bleeding into preview. */
const PREVIEW_ROOT_COLORS: CSSProperties = {
  backgroundColor: "#FFFDF5",
  color: "#0F3D2E",
};

/**
 * Shared certificate page tree — identical inner layout for on-screen preview and PDF export.
 * Do not add className or theme tokens here.
 */
export function CertificatePageContent({ data }: { data: CertificateDisplayData }) {
  return (
    <div style={{ ...certificatePageStyle(), ...PREVIEW_ROOT_COLORS }}>
      <CertificatePageBody data={data} />
    </div>
  );
}

/**
 * Responsive on-screen certificate preview.
 * Scales the shared CertificatePageContent tree with `transform: scale()`.
 *
 * NOTE: never use CSS `zoom` here. `zoom` is non-standard and fails to paint
 * large content nested inside the dialog's transform/overflow clip on WebKit
 * (Safari/iOS) and older Chromium — that produced the blank preview while the
 * PDF (body-portal + html2canvas) kept working. `transform: scale()` is the
 * cross-browser-safe equivalent.
 */
export const CertificatePreview = forwardRef<
  HTMLDivElement,
  { data: CertificateDisplayData; className?: string }
>(function CertificatePreview({ data, className }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 4) {
        setScale(Math.min(1, w / CERTIFICATE_WIDTH_PX));
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);

    // Dialog open animations can report 0 width on first paint — remeasure after settle.
    const raf = requestAnimationFrame(update);
    const t1 = window.setTimeout(update, 100);
    const t2 = window.setTimeout(update, 350);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [data]);

  const scaledHeight = Math.ceil(CERTIFICATE_HEIGHT_PX * scale);

  return (
    <div
      ref={(node) => {
        containerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={className}
      style={{
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        height: scaledHeight,
        overflow: "hidden",
        position: "relative",
        borderRadius: 8,
        border: "1px solid #d8e5dd",
        backgroundColor: "#FFFDF5",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: CERTIFICATE_WIDTH_PX,
          height: CERTIFICATE_HEIGHT_PX,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <CertificatePageContent data={data} />
      </div>
    </div>
  );
});
