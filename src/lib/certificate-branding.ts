/** Public logo files (served from /public/logos). Bump cache version when files are replaced. */
export const CERTIFICATE_SCHOOL_LOGO_PATH = "/logos/ignite-school-2.jpeg";
export const CERTIFICATE_ISLAMIC_LOGO_PATH = "/logos/ignite-islamic-department.jpg";
export const CERTIFICATE_SIGNATURE_AR_IMAGE_PATH = "/logos/ayman-signature.jpg";
export const CERTIFICATE_SIGNATURE_EN_IMAGE_PATH = "/logos/ayman-signature.2.jpg";
export const CERTIFICATE_LOGO_CACHE_VERSION = "20260830";

function publicAssetUrl(path: string): string {
  const url = `${path}?v=${CERTIFICATE_LOGO_CACHE_VERSION}`;
  if (typeof window !== "undefined") {
    return new URL(url, window.location.origin).href;
  }
  return url;
}

export function certificateSchoolLogoUrl(): string {
  return publicAssetUrl(CERTIFICATE_SCHOOL_LOGO_PATH);
}

export function certificateIslamicLogoUrl(): string {
  return publicAssetUrl(CERTIFICATE_ISLAMIC_LOGO_PATH);
}

export function certificateSignatureArImageUrl(): string {
  return publicAssetUrl(CERTIFICATE_SIGNATURE_AR_IMAGE_PATH);
}

export function certificateSignatureEnImageUrl(): string {
  return publicAssetUrl(CERTIFICATE_SIGNATURE_EN_IMAGE_PATH);
}

export const CERTIFICATE_SIGNATURE = {
  arName: "أيمن عبد الله",
  arTitle: "رئيس قسم التربية الإسلامية",
  enName: "Ayman Abdullah",
  enTitle: "Head of Islamic Education Department",
} as const;
