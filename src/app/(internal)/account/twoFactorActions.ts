"use server";

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { hashToken, verifyPassword } from "@/lib/auth";
import { generateTotpSecret, verifyTotpCode, otpAuthUrl, generateBackupCodes } from "@/lib/totp";
import { requireUser } from "@/lib/session";
import { branding } from "@/lib/branding";

type BackupCode = { hash: string; usedAt: string | null };

// Sets a new secret but leaves twoFactorEnabled false — enrollment isn't
// "on" until confirmTwoFactorEnrollment proves the user actually scanned
// it correctly, so a botched scan never locks anyone out of their own
// account.
export async function startTwoFactorEnrollment() {
  const user = await requireUser();
  const secret = generateTotpSecret();
  await db.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret, twoFactorEnabled: false },
  });

  const url = otpAuthUrl(secret, user.email, branding.businessName);
  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 200 });
  return { secret, qrDataUrl };
}

export async function confirmTwoFactorEnrollment(formData: FormData) {
  const user = await requireUser();
  const code = str(formData, "code");

  const fullUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!fullUser.twoFactorSecret) {
    throw new Error("Start enrollment first.");
  }
  if (!code || !verifyTotpCode(fullUser.twoFactorSecret, code)) {
    throw new Error("That code didn't match — check the time on your phone and try again.");
  }

  const backupCodes = generateBackupCodes(8);
  const stored: BackupCode[] = backupCodes.map((c) => ({ hash: hashToken(c), usedAt: null }));
  await db.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true, twoFactorBackupCodes: JSON.stringify(stored) },
  });

  revalidatePath("/account");
  return { backupCodes };
}

// Only clears an in-progress (never-confirmed) enrollment — an already
// enabled account must go through disableTwoFactor below, which requires
// a password.
export async function cancelTwoFactorEnrollment() {
  const user = await requireUser();
  await db.user.updateMany({
    where: { id: user.id, twoFactorEnabled: false },
    data: { twoFactorSecret: null },
  });
  revalidatePath("/account");
}

export async function disableTwoFactor(formData: FormData) {
  const user = await requireUser();
  const password = str(formData, "password");

  const fullUser = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!password || !verifyPassword(password, fullUser.passwordHash)) {
    throw new Error("Incorrect password.");
  }

  await db.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: "[]" },
  });
  revalidatePath("/account");
}
