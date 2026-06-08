/** Public logo file (served from /public/logos). Bump cache version when the file is replaced. */
export const CERTIFICATE_LOGO_PATH = "/logos/ignite-islamic-department.jpg";
export const CERTIFICATE_LOGO_CACHE_VERSION = "20260609";

export function certificateLogoUrl(): string {
  const path = `${CERTIFICATE_LOGO_PATH}?v=${CERTIFICATE_LOGO_CACHE_VERSION}`;
  if (typeof window !== "undefined") {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

export const CERTIFICATE_SIGNATURE = {
  arName: "أيمن عبد الله",
  arTitle: "رئيس قسم التربية الإسلامية",
  enName: "Ayman Abdullah",
  enTitle: "Head of Islamic Education Department",
} as const;
