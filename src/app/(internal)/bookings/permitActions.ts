"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { requireUser } from "@/lib/session";

// Manual on/off — address matching (see matchesPermitArea) only decides
// whether this shows up by default; staff always have the final say, in
// either direction (flagging an edge case, or clearing a false positive).
export async function setPermitRequired(bookingId: string, required: boolean) {
  const user = await requireUser();
  await db.booking.updateMany({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    data: {
      permitRequired: required,
      ...(required ? {} : { permitNumber: null, permitStatus: null }),
    },
  });
  revalidatePath(`/bookings/${bookingId}`);
}

export async function updatePermit(bookingId: string, formData: FormData) {
  const user = await requireUser();
  await db.booking.updateMany({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    data: {
      permitNumber: str(formData, "permitNumber"),
      permitStatus: str(formData, "permitStatus"),
    },
  });
  revalidatePath(`/bookings/${bookingId}`);
}
