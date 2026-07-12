"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { sendEmailVerification } from "@/lib/verification";

// Triggered from the unverified-account banner shown across every internal
// page (see Sidebar/layout). Always looks up the org fresh rather than
// trusting anything client-passed — this only ever acts on the current,
// already-authenticated user's own account.
export async function resendVerificationEmailAction() {
  const user = await requireUser();
  const organization = await db.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
  });

  await sendEmailVerification({
    id: user.id,
    email: user.email,
    name: user.name,
    organizationName: organization.name,
  });

  revalidatePath("/");
}
