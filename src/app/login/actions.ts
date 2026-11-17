"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { sendNotificationEmail } from "@/lib/email";
import {
  createSessionToken,
  createPendingTwoFactorToken,
  verifyPassword,
  SESSION_COOKIE,
  PENDING_TWO_FACTOR_COOKIE,
} from "@/lib/auth";
import {
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MINUTES,
  isLockedOut,
  nextFailureState,
  safeRedirectPath,
} from "@/lib/loginThrottle";

// After MAX_FAILED_ATTEMPTS consecutive failed attempts, the account is
// locked for LOCKOUT_MINUTES regardless of whether a later attempt has the
// right password — plain brute-force protection, since nothing else in the
// app rate-limits repeated login POSTs. See src/lib/loginThrottle.ts.

export async function login(formData: FormData) {
  const email = str(formData, "email");
  const password = str(formData, "password");
  const from = str(formData, "from");
  const fromParam = from ? `&from=${encodeURIComponent(from)}` : "";

  const user = email
    ? await db.user.findUnique({ where: { email: email.toLowerCase() } })
    : null;

  if (user && isLockedOut(user, new Date())) {
    redirect(`/login?error=locked${fromParam}`);
  }

  if (!user || !user.active || !password || !verifyPassword(password, user.passwordHash)) {
    if (user) {
      const { justLocked, ...nextState } = nextFailureState(user, new Date());
      await db.user.update({ where: { id: user.id }, data: nextState });
      // Fires once per lockout episode — every attempt after this one is
      // rejected by the lockedUntil check above before it ever reaches
      // here again, so this can't spam on repeated hammering.
      if (justLocked) {
        const headerList = await headers();
        const ip =
          headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          headerList.get("x-real-ip") ??
          "unknown";
        await sendNotificationEmail(
          `Account locked: ${MAX_FAILED_ATTEMPTS} failed login attempts`,
          [
            `${user.email} (${user.name}) was locked out after ${MAX_FAILED_ATTEMPTS} consecutive failed login attempts.`,
            `Locked until: ${new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toLocaleString()}`,
            `Request IP: ${ip}`,
            "",
            "If this wasn't the account owner, consider resetting the password once it unlocks.",
          ].join("\n")
        );
      }
    }
    redirect(`/login?error=1${fromParam}`);
  }

  // With 2FA on, a right password alone doesn't clear the counter — the
  // failed-code attempts in verify-2fa share it, and clearing it here would
  // let someone who knows the password reset their guess budget just by
  // logging in again. It's cleared once the code step succeeds instead.
  if (!user.twoFactorEnabled && (user.failedLoginAttempts > 0 || user.lockedUntil)) {
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const cookieStore = await cookies();

  // The password was right, but that's not enough on its own for an
  // account with 2FA enabled — park it in a short-lived pending state and
  // send it to the code-entry step instead of granting the real session
  // cookie yet.
  if (user.twoFactorEnabled) {
    cookieStore.set(PENDING_TWO_FACTOR_COOKIE, createPendingTwoFactorToken(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 5,
    });
    redirect(`/login/verify-2fa${from ? `?from=${encodeURIComponent(from)}` : ""}`);
  }

  cookieStore.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(safeRedirectPath(from));
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(PENDING_TWO_FACTOR_COOKIE);
  redirect("/login");
}
