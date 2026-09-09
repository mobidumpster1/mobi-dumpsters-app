import QRCode from "qrcode";

// The QR code just encodes a normal URL — no custom in-app scanner is
// required to use it, a phone's stock camera app already offers to open a
// scanned link. The in-app scanner (QrScanner component) is a convenience
// for staying inside the app instead of switching to the camera app.
export function equipmentScanUrl(origin: string, equipmentItemId: string): string {
  return `${origin}/scan/${equipmentItemId}`;
}

export async function equipmentQrCodeDataUrl(scanUrl: string): Promise<string> {
  return QRCode.toDataURL(scanUrl, { margin: 1, width: 240 });
}
