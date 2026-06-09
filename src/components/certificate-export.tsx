import { forwardRef, type CSSProperties } from "react";
import type { CertificateDisplayData } from "@/lib/certificate";
import {
  CertificatePageBody,
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
  certificatePageStyle,
} from "@/components/certificate-body";

/** Element id passed to html2canvas — must not use className or theme CSS */
export const CERTIFICATE_EXPORT_ID = "certificate-export";

const exportRootStyle: CSSProperties = {
  position: "fixed",
  left: 0,
  top: 0,
  width: CERTIFICATE_WIDTH_PX,
  height: CERTIFICATE_HEIGHT_PX,
  zIndex: -1,
  overflow: "hidden",
  pointerEvents: "none",
  transform: "translateX(-300vw)",
  opacity: 1,
  visibility: "visible",
  margin: 0,
  padding: 0,
  border: "none",
  boxSizing: "border-box",
  backgroundColor: "#FFFDF5",
  color: "#0F3D2E",
  lineHeight: "normal",
};

/**
 * PDF-only certificate tree: inline HEX styles, no className, no CSS variables.
 * Portaled to document.body; html2canvas captures #certificate-export only.
 */
export const CertificateExport = forwardRef<
  HTMLDivElement,
  { data: CertificateDisplayData }
>(function CertificateExport({ data }, ref) {
  return (
    <div id={CERTIFICATE_EXPORT_ID} ref={ref} aria-hidden={true} style={exportRootStyle}>
      <div style={certificatePageStyle()}>
        <CertificatePageBody data={data} />
      </div>
    </div>
  );
});
