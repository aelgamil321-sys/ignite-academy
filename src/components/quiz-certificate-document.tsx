import { forwardRef } from "react";
import type { QuizCertificateDisplayData } from "@/lib/quiz-certificate";
import {
  CertificatePageBody,
  CERTIFICATE_HEIGHT_PX,
  CERTIFICATE_WIDTH_PX,
  CERT_COLORS,
  certificatePageStyle,
  getCertificateLogoUrl,
} from "@/components/certificate-body";

export { CERTIFICATE_WIDTH_PX, CERTIFICATE_HEIGHT_PX, CERT_COLORS };

/** On-screen preview only — not used for PDF capture. */
export const QuizCertificateDocument = forwardRef<
  HTMLDivElement,
  { data: QuizCertificateDisplayData }
>(function QuizCertificateDocument({ data }, ref) {
  return (
    <div ref={ref} data-certificate-root style={certificatePageStyle()}>
      <CertificatePageBody data={data} logoUrl={getCertificateLogoUrl()} />
    </div>
  );
});
