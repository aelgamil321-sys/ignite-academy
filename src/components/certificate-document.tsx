import { forwardRef } from "react";
import type { CertificateDisplayData } from "@/lib/certificate";
import {
  CertificatePageBody,
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
  CERT_COLORS,
  certificatePageStyle,
} from "@/components/certificate-body";

export { CERTIFICATE_WIDTH_PX, CERTIFICATE_HEIGHT_PX, CERT_COLORS };

/** On-screen certificate preview — uses the global CertificatePageBody template. */
export const CertificateDocument = forwardRef<
  HTMLDivElement,
  { data: CertificateDisplayData }
>(function CertificateDocument({ data }, ref) {
  return (
    <div ref={ref} data-certificate-root style={certificatePageStyle()}>
      <CertificatePageBody data={data} />
    </div>
  );
});
