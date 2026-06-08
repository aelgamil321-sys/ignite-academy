import QRCode from "qrcode";

export async function buildCertificateQrDataUrl(certificateId: string): Promise<string> {
  return QRCode.toDataURL(certificateId, {
    margin: 1,
    width: 144,
    color: {
      dark: "#0F3D2E",
      light: "#FFFFFF",
    },
  });
}
