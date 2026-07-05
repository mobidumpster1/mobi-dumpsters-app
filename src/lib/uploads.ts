import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

// Saves an uploaded photo to uploads/<folder>/<id>/ on local disk and
// returns the relative path to store on the Photo/EquipmentPhoto record.
// Serving is handled by src/app/api/uploads/[...path]/route.ts, not the
// public folder.
async function saveUploadedFile(
  folder: string,
  id: string,
  file: File
): Promise<string> {
  const dir = path.join(UPLOADS_ROOT, folder, id);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(dir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return path.posix.join(folder, id, filename);
}

export function savePhotoFile(bookingId: string, file: File): Promise<string> {
  return saveUploadedFile("bookings", bookingId, file);
}

export function saveEquipmentPhotoFile(
  equipmentItemId: string,
  file: File
): Promise<string> {
  return saveUploadedFile("equipment", equipmentItemId, file);
}

export function saveExpenseReceiptFile(
  expenseId: string,
  file: File
): Promise<string> {
  return saveUploadedFile("expenses", expenseId, file);
}

export function saveCustomerPhotoFile(
  customerId: string,
  file: File
): Promise<string> {
  return saveUploadedFile("customers", customerId, file);
}

export function uploadsRoot() {
  return UPLOADS_ROOT;
}
