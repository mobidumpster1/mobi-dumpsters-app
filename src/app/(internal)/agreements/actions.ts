"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser } from "@/lib/session";

async function requireOwnedAgreement(agreementId: string, organizationId: string) {
  await db.signedAgreement.findFirstOrThrow({
    where: {
      id: agreementId,
      OR: [
        { customer: { organizationId } },
        { booking: { organizationId } },
      ],
    },
  });
}

export async function updateSignedAgreement(agreementId: string, formData: FormData) {
  const user = await requireUser();
  await requireOwnedAgreement(agreementId, user.effectiveOrganizationId);

  const signerName = str(formData, "signerName");
  const agreedAtStr = str(formData, "agreedAt");
  if (!signerName) throw new Error("Signer name is required");
  if (!agreedAtStr) throw new Error("Signed date is required");

  const customerId = str(formData, "customerId");

  // agreementTitle/agreementText are deliberately NOT editable here (T061)
  // — they're the actual legal terms a customer signed, captured verbatim
  // at signing time specifically so a later wording change never rewrites
  // history (see the model's own comment). Only signer metadata can be
  // corrected after the fact; if the terms themselves were genuinely
  // wrong, the fix is a new signature, not silently editing this one.
  await db.signedAgreement.update({
    where: { id: agreementId },
    data: {
      signerName,
      signerEmail: str(formData, "signerEmail"),
      signerPhone: str(formData, "signerPhone"),
      signerAddress: str(formData, "signerAddress"),
      agreedAt: new Date(agreedAtStr),
      customerId: customerId || null,
    },
  });

  revalidatePath("/agreements");
  revalidatePath(`/agreements/${agreementId}`);
  redirect(`/agreements/${agreementId}`);
}

export async function deleteSignedAgreement(agreementId: string) {
  const user = await requireUser();
  await requireOwnedAgreement(agreementId, user.effectiveOrganizationId);

  await db.signedAgreement.delete({ where: { id: agreementId } });
  revalidatePath("/agreements");
  redirect("/agreements");
}
