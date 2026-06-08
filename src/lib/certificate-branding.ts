import certificateLogoAsset from "../../public/logos/ignite-islamic-department.jpg?url";

/** Bundled logo URL (works in dev, build, and PDF capture). */
export const CERTIFICATE_LOGO_PATH = certificateLogoAsset;

export function certificateLogoUrl(): string {
  if (typeof window !== "undefined" && CERTIFICATE_LOGO_PATH.startsWith("/")) {
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
