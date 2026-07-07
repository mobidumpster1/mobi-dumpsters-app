import { put, del } from "@vercel/blob";
import path from "path";

// Saves an uploaded file to Vercel Blob storage and returns its public URL,
// stored directly on the Photo/EquipmentPhoto/CustomerPhoto/ExpenseReceipt
// record. Local disk isn't an option here — Vercel's serverless functions
// can't write to disk in production, so files need to live in real storage.
async function saveUploadedFile(
  folder: string,
  id: string,
  file: File
): Promise<string> {
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const pathname = `${folder}/${id}/${filename}`;

  const blob = await put(pathname, file, { access: "public" });
  return blob.url;
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

// Deletes a previously-uploaded file given the full URL stored on its
// record. Safe to call even if the file is already gone.
export async function deleteUploadedFile(url: string): Promise<void> {
  await del(url).catch(() => {});
}
