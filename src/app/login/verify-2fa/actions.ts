"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import {
  verifyPendingTwoFactorToken,
  createSessionToken,
  hashToken,
  SESSION_COOKIE,
  PENDING_TWO_FACTOR_COOKIE,
} from "@/lib/auth";
import { verifyTotpCode } from "@/lib/totp";

type BackupCode = { hash: string; usedAt: string | null };

export async function verifyTwoFactorLogin(formData: FormData) {
  const code = str(formData, "code");
  const from = str(formData, "from");
  const cookieStore = await cookies();
  const pending = verifyPendingTwoFactorToken(cookieStore.get(PENDING_TWO_FACTOR_COOKIE)?.value);

  if (!pending) {
    redirect("/login");
  }

  const user = await db.user.findUnique({ where: { id: pending.userId } });
  if (!user || !user.active || !user.twoFactorEnabled || !user.twoFactorSecret) {
    cookieStore.delete(PENDING_TWO_FACTOR_COOKIE);
    redirect("/login");
  }

  const fromSuffix = from ? `&from=${encodeURIComponent(from)}` : "";
  if (!code) {
    redirect(`/login/verify-2fa?error=1${fromSuffix}`);
  }

  const cleanCode = code.trim();
  let verified = verifyTotpCode(user.twoFactorSecret, cleanCode);

  // Not a live 6-digit code — try it as a one-time backup code instead.
  // A match is burned (marked used) immediately so it can't be replayed.
  if (!verified) {
    const backupCodes: BackupCode[] = JSON.parse(user.twoFactorBackupCodes || "[]");
    const codeHash = hashToken(cleanCode.toUpperCase());
    const matchIndex = backupCodes.findIndex((c) => c.hash === codeHash && !c.usedAt);
    if (matchIndex !== -1) {
      verified = true;
      backupCodes[matchIndex] = { ...backupCodes[matchIndex], usedAt: new Date().toISOString() };
      await db.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
      });
    }
  }

  if (!verified) {
    redirect(`/login/verify-2fa?error=1${fromSuffix}`);
  }

  cookieStore.delete(PENDING_TWO_FACTOR_COOKIE);
  cookieStore.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(from && from.startsWith("/") ? from : "/");
}
