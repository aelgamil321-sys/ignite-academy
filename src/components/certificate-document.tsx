import { forwardRef } from "react";
import type { CertificateDisplayData } from "@/lib/certificate";
import { CertificatePageContent } from "@/components/certificate-preview";
import {
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
  CERT_COLORS,
} from "@/components/certificate-body";

export { CERTIFICATE_WIDTH_PX, CERTIFICATE_HEIGHT_PX, CERT_COLORS };

/** Full-size certificate page — same tree as PDF export (prefer CertificatePreview in modals). */
export const CertificateDocument = forwardRef<
  HTMLDivElement,
  { data: CertificateDisplayData }
>(function CertificateDocument({ data }, ref) {
  return (
    <div ref={ref} data-certificate-root>
      <CertificatePageContent data={data} />
    </div>
  );
});
