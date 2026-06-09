/**
 * Global certificate template — single source of truth for the entire platform.
 *
 * Visual layout: certificate-body.tsx (CertificatePageBody)
 * Applies to KG1–Grade 12 and all completion types without per-grade configuration.
 */

export {
  CertificatePageBody,
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
  CERT_COLORS,
  certificatePageStyle,
} from "@/components/certificate-body";

export { CertificateDocument } from "@/components/certificate-document";

export { CertificateExport, CERTIFICATE_EXPORT_ID } from "@/components/certificate-export";

export { CertificateButton, CertificateModal } from "@/components/certificate-modal";
