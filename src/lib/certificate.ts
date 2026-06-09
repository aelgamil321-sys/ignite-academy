/**
 * Platform-wide certificate module.
 *
 * All certificates (lesson quizzes, assessments, projects, assignments, and future
 * completion types) use the approved template in:
 *   src/components/certificate-body.tsx — CertificatePageBody
 *
 * Applies to every grade level (KG1, KG2, Grades 1–12) with no per-grade overrides.
 */

export type {
  CertificateDisplayData,
  CertificateNameProfile,
  CertificateStudentNames,
  QuizCertificateDisplayData,
  QuizCertificateRecord,
} from "@/lib/quiz-certificate";

export {
  buildCertificateDisplayData,
  canIssueCertificate,
  canIssueQuizCertificate,
  CERTIFICATE_NAME_FALLBACK_AR,
  CERTIFICATE_NAME_FALLBACK_EN,
  generateCertificateId,
  getOrCreateQuizCertificate,
  resolveCertificateStudentNames,
} from "@/lib/quiz-certificate";

export {
  downloadCertificatePdf,
  safeCertificateFilename,
} from "@/lib/certificate-pdf";

export { buildCertificateQrDataUrl } from "@/lib/certificate-qr";

export {
  CERTIFICATE_ISLAMIC_LOGO_PATH,
  CERTIFICATE_LOGO_CACHE_VERSION,
  CERTIFICATE_SCHOOL_LOGO_PATH,
  CERTIFICATE_SIGNATURE,
  CERTIFICATE_SIGNATURE_AR_IMAGE_PATH,
  CERTIFICATE_SIGNATURE_EN_IMAGE_PATH,
  certificateIslamicLogoUrl,
  certificateSchoolLogoUrl,
  certificateSignatureArImageUrl,
  certificateSignatureEnImageUrl,
} from "@/lib/certificate-branding";
