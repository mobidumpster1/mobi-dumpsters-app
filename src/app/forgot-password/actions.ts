"use server";

import { redirect } from "next/navigation";
import { str } from "@/lib/formData";
import { sendPasswordResetIfAccountExists } from "@/lib/verification";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestPasswordReset(formData: FormData) {
  const email = str(formData, "email");

  // Same redirect regardless of whether the email matched a real account —
  // sendPasswordResetIfAccountExists is a no-op for one that doesn't, and
  // the page must never reveal which happened.
  if (email && EMAIL_PATTERN.test(email)) {
    await sendPasswordResetIfAccountExists(email);
  }

  redirect("/forgot-password?sent=1");
}
