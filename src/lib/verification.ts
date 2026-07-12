import "server-only";
import { db } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/auth";
import { sendCustomerEmail, siteOrigin } from "@/lib/email";

const EMAIL_VERIFICATION_TTL_MS = 48 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

// Creates a fresh verification token (deleting any unused one for this
// user first, so only the most recently sent link works) and emails it.
// Best-effort — a Resend hiccup shouldn't block signup itself, so the
// send failure is logged rather than thrown.
export async function sendEmailVerification(user: {
  id: string;
  email: string;
  name: string;
  organizationName: string;
}) {
  await db.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  const token = generateToken();
  await db.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
  });

  const link = `${siteOrigin()}/verify-email?token=${token}`;
  const body = `Hi ${user.name},\n\nClick the link below to verify your email address for ${user.organizationName}:\n\n${link}\n\nThis link expires in 48 hours. If you didn't create this account, you can ignore this email.`;

  try {
    await sendCustomerEmail(user.email, `Verify your email — ${user.organizationName}`, body);
  } catch (error) {
    console.error("Failed to send verification email:", error);
  }
}

export async function applyEmailVerification(
  rawToken: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const record = await db.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!record || record.usedAt) {
    return { ok: false, error: "This verification link is invalid or has already been used." };
  }
  if (record.expiresAt < new Date()) {
    return {
      ok: false,
      error: "This verification link has expired — request a new one from inside the app.",
    };
  }

  await db.$transaction([
    db.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
  return { ok: true };
}

// Looks and behaves identically whether or not the email matches a real,
// active account — callers must always show the same generic confirmation
// message, so this function never reveals account existence one way or
// the other.
export async function sendPasswordResetIfAccountExists(email: string) {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { organization: true },
  });
  if (!user || !user.active) return;

  await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
  const token = generateToken();
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  const link = `${siteOrigin()}/reset-password?token=${token}`;
  const body = `Hi ${user.name},\n\nWe received a request to reset your password for ${user.organization.name}. Click the link below to choose a new password:\n\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.`;

  try {
    await sendCustomerEmail(user.email, `Reset your password — ${user.organization.name}`, body);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }
}

// Read-only check used to decide whether /reset-password should show the
// new-password form or an error, without burning the token — the actual
// consume-and-apply happens in applyPasswordReset once a new password is
// submitted.
export async function isPasswordResetTokenValid(rawToken: string): Promise<boolean> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  return Boolean(record && !record.usedAt && record.expiresAt > new Date());
}

export async function applyPasswordReset(
  rawToken: string,
  newPasswordHash: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!record || record.usedAt) {
    return { ok: false, error: "This reset link is invalid or has already been used." };
  }
  if (record.expiresAt < new Date()) {
    return { ok: false, error: "This reset link has expired — request a new one." };
  }

  await db.$transaction([
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { passwordHash: newPasswordHash } }),
  ]);
  return { ok: true };
}
