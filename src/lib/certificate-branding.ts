/** Public logo path (served from /public/logos). */
export const CERTIFICATE_LOGO_PATH = "/logos/ignite-islamic-department.jpg";

export function certificateLogoUrl(): string {
  if (typeof window !== "undefined") {
    return new URL(CERTIFICATE_LOGO_PATH, window.location.origin).href;
  }
  return CERTIFICATE_LOGO_PATH;
}

export const CERTIFICATE_SIGNATURE = {
  arName: "أيمن عبد الله",
  arTitle: "رئيس قسم التربية الإسلامية",
  enName: "Ayman Abdullah",
  enTitle: "Head of Islamic Education Department",
} as const;
