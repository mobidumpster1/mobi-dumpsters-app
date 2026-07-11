"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { saveDocumentFile, deleteUploadedFile } from "@/lib/uploads";
import { requirePermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

export async function createDocument(formData: FormData) {
  const user = await requirePermission("canViewReports");

  const type = str(formData, "type");
  const name = str(formData, "name");
  const expiresOnStr = str(formData, "expiresOn");
  const vehicleId = str(formData, "vehicleId");
  const notes = str(formData, "notes");
  const file = formData.get("file");

  if (!type) throw new Error("Type is required");
  if (!name) throw new Error("Name is required");
  if (!expiresOnStr) throw new Error("Expiration date is required");
  if (!(file instanceof File) || file.size === 0) throw new Error("A file is required");

  const fileUrl = await saveDocumentFile(file);

  const document = await db.document.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      type,
      name,
      expiresOn: new Date(expiresOnStr),
      notes,
      vehicleId,
      fileUrl,
    },
  });

  await logAction("document.created", "Document", document.id);
  revalidatePath("/documents");
  revalidatePath("/");
}

export async function deleteDocument(documentId: string) {
  const user = await requirePermission("canViewReports");

  const document = await db.document.findFirstOrThrow({
    where: { id: documentId, organizationId: user.effectiveOrganizationId },
  });
  await db.document.delete({ where: { id: documentId } });
  await deleteUploadedFile(document.fileUrl);
  await logAction("document.deleted", "Document", documentId);
  revalidatePath("/documents");
  revalidatePath("/");
}
